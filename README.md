# Darrian's Sites

A monorepo of three static, dependency-free web apps (vanilla JS + `localStorage`, dark themed).

| Site | Folder | What it is |
|------|--------|------------|
| **Sole Ops** | [`sole-ops/`](sole-ops/) | Sneaker-reselling ops dashboard — inventory, profit calculator, listings, analytics |
| **Peach State Savings** | [`peach-state-savings/`](peach-state-savings/) | Personal finance — transactions, budgets, goals, net worth, bills |
| **College Confused** | [`college-confused/`](college-confused/) | Free college-prep tools — timeline, scholarships, essays, FAFSA, SAT/ACT (+ a blog) |

## Run locally

No build step. Serve the folder and open it:

```bash
python3 -m http.server 8000 --directory sole-ops      # then open http://localhost:8000
```

## SDLC / CI pipeline

Every push to `main` and every pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **HTML validation** — W3C Nu validator (`html5validator-action`).
2. **Lighthouse CI** — audits accessibility, performance, best-practices, and SEO for all
   three sites against the budgets in [`lighthouserc.json`](lighthouserc.json). The build
   **fails** if accessibility drops below 90; performance/SEO/best-practices warn.
   Lighthouse's accessibility category runs `axe-core` under the hood.

Reports upload to Lighthouse CI temporary public storage (link in the Action log).

3. **Deploy** — on push to `main` (after the checks pass) the repo publishes to
   **GitHub Pages**. A landing page ([`index.html`](index.html)) links to each site,
   served at `/sole-ops/`, `/peach-state-savings/`, `/college-confused/`.
   Enable once after first push: repo **Settings → Pages → Source: GitHub Actions**.

## Notes

- `*/photos/` are git-ignored: they're large local media not referenced by the sites.
- Roadmap and design/testing rationale: `../BRD-three-sites-design-testing.md`.
