#!/usr/bin/env python3
"""Build college-confused/data/colleges.json from the College Scorecard institution file.

The data is U.S. Department of Education College Scorecard, "Most Recent Cohorts
(Institution-Level)" — public domain. We ship a committed snapshot rather than calling the
Scorecard API from the browser: an API key in client JS is public, the API is rate-limited
per key (1,000 req/hr), and one scraper would burn the quota for every visitor. The bulk
CSV needs no key at all.

Usage:
    # Download + unzip the current file first (the filename carries a release date):
    #   https://collegescorecard.ed.gov/data/  ->  "Most Recent Institution-Level Data"
    #   e.g. https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_06102026.zip
    python3 scripts/build_colleges_json.py path/to/Most-Recent-Cohorts-Institution.csv

Re-run roughly annually when Scorecard publishes a new release, then update the "as_of"
date shown to users on cost-tool.html.

stdlib only, by design — this repo has no build step and must not acquire one.
"""

import csv
import json
import os
import sys
from datetime import date

# Output is column-oriented: a "fields" header plus rows as plain arrays. Repeating 16 object
# keys across ~2,000 schools more than doubles the file for zero benefit.
FIELDS = [
    "id", "name", "city", "state", "control", "ugds", "sticker",
    "np_0_30", "np_30_48", "np_48_75", "np_75_110", "np_110_plus",
    "adm_rate", "grad_rate", "median_debt", "median_earn_10yr",
]

# Net price is reported in separate column families for public vs private institutions.
# CONTROL: 1 = public, 2 = private nonprofit, 3 = private for-profit.
NET_PRICE_BANDS = ["NPT41", "NPT42", "NPT43", "NPT44", "NPT45"]

# Scorecard uses these sentinels for "no data" and "withheld to protect privacy".
# Both must survive as JSON null. Coercing either to 0 would render a school as free.
NULL_TOKENS = {"", "NULL", "PrivacySuppressed", "PS"}


def num(raw, cast=int, ndigits=None):
    """Parse a Scorecard cell, preserving missing/suppressed values as None."""
    if raw is None or raw.strip() in NULL_TOKENS:
        return None
    try:
        value = cast(float(raw))
    except (TypeError, ValueError):
        return None
    return round(value, ndigits) if ndigits is not None else value


def build(csv_path, out_path):
    rows = []
    seen_ids = set()
    skipped_no_name = 0

    with open(csv_path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)

        missing = [c for c in ("UNITID", "INSTNM", "PREDDEG", "ICLEVEL", "CONTROL") if c not in reader.fieldnames]
        if missing:
            sys.exit(f"ERROR: input is missing required columns: {', '.join(missing)}\n"
                     f"The Scorecard schema may have changed — check the data dictionary.")

        for rec in reader:
            # Four-year institutions only: predominantly bachelor's-degree granting (PREDDEG 3)
            # at the four-or-more-year level (ICLEVEL 1).
            if rec.get("PREDDEG") != "3" or rec.get("ICLEVEL") != "1":
                continue

            name = (rec.get("INSTNM") or "").strip()
            if not name:
                skipped_no_name += 1
                continue

            unitid = num(rec.get("UNITID"))
            if unitid is None or unitid in seen_ids:
                continue
            seen_ids.add(unitid)

            control = num(rec.get("CONTROL"))
            suffix = "PUB" if control == 1 else "PRIV"
            net_price = [num(rec.get(f"{band}_{suffix}")) for band in NET_PRICE_BANDS]

            rows.append([
                unitid,
                name,
                (rec.get("CITY") or "").strip() or None,
                (rec.get("STABBR") or "").strip() or None,
                control,
                num(rec.get("UGDS")),
                num(rec.get("COSTT4_A")),
                *net_price,
                num(rec.get("ADM_RATE"), float, 4),
                num(rec.get("C150_4"), float, 4),
                num(rec.get("GRAD_DEBT_MDN")),
                num(rec.get("MD_EARN_WNE_P10")),
            ])

    rows.sort(key=lambda r: r[1])

    payload = {
        "source": "U.S. Department of Education, College Scorecard — Most Recent Cohorts (Institution-Level)",
        "source_url": "https://collegescorecard.ed.gov/data/",
        "license": "Public domain (U.S. federal government work)",
        "as_of": date.today().isoformat(),
        "note": "Net price is the average annual price actually paid by federal-aid recipients "
                "in each family-income band, after grants and scholarships. null means the school "
                "did not report it or the value was suppressed to protect student privacy.",
        "income_bands": ["$0-30,000", "$30,001-48,000", "$48,001-75,000", "$75,001-110,000", "$110,001+"],
        "fields": FIELDS,
        "rows": rows,
    }

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"), ensure_ascii=False)

    report(rows, out_path, skipped_no_name)


def report(rows, out_path, skipped_no_name):
    """Print a summary. A null-count spike is the signal that a column name drifted."""
    total = len(rows)
    size = os.path.getsize(out_path)
    print(f"\nWrote {out_path}")
    print(f"  schools : {total}")
    print(f"  size    : {size / 1024:.0f} KB raw")
    if skipped_no_name:
        print(f"  skipped : {skipped_no_name} rows with no institution name")

    print("\n  null rate by field (a spike here means a column name changed):")
    for i, field in enumerate(FIELDS):
        nulls = sum(1 for r in rows if r[i] is None)
        pct = (nulls / total * 100) if total else 0
        flag = "  <-- CHECK" if pct > 60 else ""
        print(f"    {field:<18} {nulls:>5} / {total}  ({pct:4.1f}%){flag}")

    if total < 1000:
        print("\n  WARNING: fewer than 1,000 schools — check the PREDDEG/ICLEVEL filter.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    build(sys.argv[1], os.path.join(repo_root, "college-confused", "data", "colleges.json"))
