// Phase 0 — Hinglish STT Benchmark (go/no-go gate for Phase 1)
// Usage:
//   DEEPGRAM_API_KEY=xxx node benchmark.mjs
//   Audio files: ./audio/<test-id>.mp3|wav|m4a  (test-scripts.json ke ids)
// Output: report.md + report.json
// Pass criteria (README dekho):
//   English WER <= 10% · Hinglish/Hindi WER <= 20% · Keyterm recall >= 90%

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.DEEPGRAM_API_KEY;
if (!KEY) { console.error("DEEPGRAM_API_KEY missing. Set karke dubara run karo."); process.exit(1); }

const tests = JSON.parse(readFileSync(join(dir, "test-scripts.json"), "utf8")).tests;

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\u0900-\u097F ]/gi, " ").replace(/\s+/g, " ").trim();
function wer(ref, hyp) {
  const r = norm(ref).split(" "), h = norm(hyp).split(" ");
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (r[i-1] === h[j-1] ? 0 : 1));
  return d[r.length][h.length] / Math.max(r.length, 1);
}
const keytermRecall = (terms, hyp) => {
  const h = norm(hyp);
  const found = terms.filter(t => h.includes(norm(t)));
  return { found: found.length, total: terms.length, missing: terms.filter(t => !h.includes(norm(t))) };
};

async function transcribe(path, model, lang) {
  const buf = readFileSync(path);
  const url = `https://api.deepgram.com/v1/listen?model=${model}&smart_format=true&diarize=true` +
    (lang ? `&language=${lang}` : "&detect_language=true");
  const t0 = Date.now();
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Token ${KEY}`, "Content-Type": "application/octet-stream" }, body: buf });
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return { text: json.results.channels[0].alternatives[0].transcript, ms: Date.now() - t0 };
}

const runs = [
  { name: "nova-3-multilingual", model: "nova-3", lang: null },
  { name: "nova-3-en", model: "nova-3", lang: "en" },
  { name: "nova-3-hi", model: "nova-3", lang: "hi" },
];

const rows = [];
for (const t of tests) {
  const audio = ["mp3", "wav", "m4a", "webm"].map(e => join(dir, "audio", `${t.id}.${e}`)).find(existsSync);
  if (!audio) { console.log(`SKIP ${t.id} (audio missing)`); continue; }
  for (const r of runs) {
    try {
      const { text } = await transcribe(audio, r.model, r.lang);
      const w = wer(t.text, text), k = keytermRecall(t.keyterms, text);
      rows.push({ id: t.id, category: t.category, run: r.name, wer: +(w * 100).toFixed(1), keyterms: `${k.found}/${k.total}`, missing: k.missing, hyp: text });
      console.log(`${t.id} [${r.name}] WER ${(w * 100).toFixed(1)}% keyterms ${k.found}/${k.total}`);
    } catch (e) { console.error(`${t.id} [${r.name}] ERROR ${e.message}`); }
  }
}

// Category-wise best-run summary
const cats = {};
for (const row of rows) {
  const key = `${row.category}`;
  if (!cats[key] || row.wer < cats[key].wer) cats[key] = row;
}
let md = `# STT Benchmark Report — ${new Date().toISOString()}\n\n## Per-test best run\n\n| Test | Category | Best run | WER % | Keyterms |\n|---|---|---|---|---|\n`;
for (const t of tests) {
  const best = rows.filter(r => r.id === t.id).sort((a, b) => a.wer - b.wer)[0];
  if (best) md += `| ${t.id} | ${t.category} | ${best.run} | ${best.wer} | ${best.keyterms} |\n`;
}
md += `\n## All runs (detail)\n\n${rows.map(r => `### ${r.id} · ${r.run}\n- WER: ${r.wer}% · Keyterms: ${r.keyterms}${r.missing.length ? ` · Missing: ${r.missing.join(", ")}` : ""}\n- Heard: "${r.hyp}"\n`).join("\n")}`;
writeFileSync(join(dir, "report.md"), md);
writeFileSync(join(dir, "report.json"), JSON.stringify(rows, null, 2));
console.log("\nreport.md + report.json ready.");
