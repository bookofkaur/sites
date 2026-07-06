// Cross-List end-to-end smoke test (mock pair, stubbed Claude API).
// Loads sole-ops/index.html in jsdom, fills in a mock pair of shoes, stubs the
// Anthropic API with a canned analysis, runs the real clAnalyze() pipeline, and
// asserts on both the request the app builds and the UI output it renders.
// Run: npm install --no-save jsdom && node tests/crosslist.e2e.mjs

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../sole-ops/app.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://soleops.test/' });
const { window } = dom;
const d = window.document;

const MOCK_ANALYSIS = {
  shoe: 'Nike Dunk Low Retro White Black (Panda)',
  condition_grade: 'VNDS / Like New',
  quality_notes: ['Minimal sole wear', 'Clean midsole', 'Original box present'],
  flaws: ['Light toe crease on left shoe'],
  market_low: 95,
  market_high: 130,
  prices: { ebay: 119, mercari: 112, depop: 105 },
  title: 'Nike Dunk Low Panda White Black Size 10 VNDS w/ OG Box',
  description: 'Nike Dunk Low Retro White/Black (Panda), US Men’s 10. Worn twice — VNDS. Light crease on left toe. OG box. 100% authentic.',
  confidence: 'high',
};

// Fill the composer with the mock pair
d.getElementById('cl-name').value = 'Nike Dunk Low Panda';
d.getElementById('cl-size').value = '10';
d.getElementById('cl-condition').value = 'VNDS / Like New';
d.getElementById('cl-notes').value = 'worn twice, light crease left toe, OG box';
d.getElementById('cl-api-key').value = 'sk-ant-mock-key-for-ci';
// The page script declares clPhotos with `let` (lexical scope, not a window
// property), so it must be set from inside the page context — skip the canvas
// resize path, which jsdom doesn't support.
window.eval(`clPhotos = ['bW9jay1waG90by1ieXRlcw=='];`);

// Stub the Claude API and capture the request the app builds
let captured = null;
window.fetch = async (url, opts) => {
  assert.match(String(url), /api\.anthropic\.com\/v1\/messages/, 'unexpected fetch URL');
  captured = { headers: opts.headers, body: JSON.parse(opts.body) };
  return {
    ok: true,
    json: async () => ({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(MOCK_ANALYSIS) }],
    }),
  };
};

await window.clAnalyze();

// ── Request assertions ───────────────────────────────────────────────────────
const req = captured.body;
assert.equal(req.model, 'claude-opus-4-8', 'model');
assert.equal(captured.headers['anthropic-version'], '2023-06-01', 'version header');
assert.equal(captured.headers['anthropic-dangerous-direct-browser-access'], 'true', 'browser access header');
assert.equal(req.thinking.type, 'adaptive', 'adaptive thinking');
assert.equal(req.output_config.format.type, 'json_schema', 'structured output');
assert.equal(req.messages[0].content.filter((b) => b.type === 'image').length, 1, 'image block count');
const prompt = req.messages[0].content.find((b) => b.type === 'text').text;
assert.match(prompt, /worn twice, light crease left toe/, 'prompt carries seller notes');
assert.match(prompt, /Size \(US\): 10/, 'prompt carries size');

// ── UI output assertions ─────────────────────────────────────────────────────
// clAI / clCards are also `let`-bound in the page script — read via page eval.
const clAI = window.eval('clAI');
const clCards = window.eval('clCards');
assert.equal(clAI.shoe, MOCK_ANALYSIS.shoe, 'analysis parsed');
assert.ok(!d.getElementById('cl-ai-card').classList.contains('hidden'), 'AI card visible');
assert.match(d.getElementById('cl-ai-result').textContent, /Panda/, 'AI card shows shoe');
assert.equal(d.getElementById('cl-price').value, '119', 'price auto-filled from eBay suggestion');
assert.equal(d.querySelectorAll('#cl-platform-cards .card').length, 3, 'three platform cards');
assert.equal(clCards[0].platform.name, 'eBay');
assert.equal(Math.round(clCards[0].net * 100) / 100, 102.52, 'eBay net payout math');
assert.equal(clCards[1].title.length <= 80, true, 'Mercari title within limit');
assert.match(clCards[2].description, /#sneakers/, 'Depop description carries hashtags');

// ── Mark Listed feeds the tracker ────────────────────────────────────────────
window.clMarkListed(0);
const listings = JSON.parse(window.localStorage.getItem('so_listings'));
assert.equal(listings.length, 1, 'listing tracked');
assert.equal(listings[0].platform, 'eBay');
assert.equal(listings[0].price, 119);
assert.equal(listings[0].status, 'Active');

console.log('✓ Cross-List E2E: request shape, AI parsing, platform cards, fee math, and listing tracking all pass');
