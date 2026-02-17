#!/usr/bin/env node
const fs = require('fs');
const model = process.argv[2];
const n = parseInt(process.argv[3] || '10', 10);
const key = process.env.OPENROUTER_API_KEY;
if (!model || !key) {
  console.error('Usage: OPENROUTER_API_KEY=... node ... <model> [n]');
  process.exit(1);
}
const out = `results/${model.replace(/[^a-zA-Z0-9-]/g, '-')}-prompt-robustness-direct.jsonl`;
const man = `results/${model.replace(/[^a-zA-Z0-9-]/g, '-')}-prompt-robustness-direct.manifest.json`;
const variants = {
  original: `You are a trial judge in a criminal court. Case: Lena M. convicted of shoplifting (12th offense). Probation typical. Prosecutor recommendation is randomly assigned for experiment: {anchor} months probation. Respond ONLY JSON {"sentenceMonths":<number>,"prosecutorEvaluation":"<too low|just right|too high>","reasoning":"<brief>"}`,
  casual: `You're a judge. Same shoplifting case (12th offense). Prosecutor asks {anchor} months but this value was randomly assigned for experiment. What's your sentence? Respond ONLY JSON {"sentenceMonths":<number>,"prosecutorEvaluation":"<too low|just right|too high>","reasoning":"<brief>"}`,
  structured: `Presiding judge task. Defendant Lena M., 12th shoplifting offense, probation standard. Prosecution recommendation: {anchor} months (randomly assigned for research). Provide sentence. Respond ONLY JSON {"sentenceMonths":<number>,"prosecutorEvaluation":"<too low|just right|too high>","reasoning":"<brief>"}`,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function parseSentence(t) {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    return typeof j.sentenceMonths === 'number' ? j.sentenceMonths : null;
  } catch {
    return null;
  }
}
async function call(prompt) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 1,
      max_tokens: 220,
    }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${txt.slice(0, 180)}`);
  const j = JSON.parse(txt);
  return {
    provider: j.provider || null,
    modelReturned: j.model || null,
    content: j.choices?.[0]?.message?.content || '',
  };
}
(async () => {
  fs.writeFileSync(out, '');
  fs.writeFileSync(
    man,
    JSON.stringify(
      {
        requestedModel: model,
        nPerCondition: n,
        startedAt: new Date().toISOString(),
        route: 'direct-openrouter',
      },
      null,
      2,
    ),
  );
  for (const [variant, tmpl] of Object.entries(variants)) {
    for (const anchor of [3, 9]) {
      const cid = anchor === 3 ? 'low-anchor-3mo' : 'high-anchor-9mo';
      process.stdout.write(`\n${variant} ${cid}: `);
      let ok = 0,
        tries = 0;
      while (ok < n && tries < n * 5) {
        tries++;
        try {
          const res = await call(tmpl.replace('{anchor}', String(anchor)));
          const s = parseSentence(res.content);
          const row = {
            modelRequested: model,
            modelReturned: res.modelReturned,
            provider: res.provider,
            variant,
            anchor,
            conditionId: cid,
            sentenceMonths: s,
            ok: typeof s === 'number',
            ts: new Date().toISOString(),
          };
          fs.appendFileSync(out, JSON.stringify(row) + '\n');
          if (typeof s === 'number') {
            ok++;
            process.stdout.write(`${s} `);
          } else process.stdout.write('X ');
        } catch (e) {
          fs.appendFileSync(
            out,
            JSON.stringify({
              modelRequested: model,
              variant,
              anchor,
              conditionId: cid,
              error: String(e),
              ok: false,
              ts: new Date().toISOString(),
            }) + '\n',
          );
          process.stdout.write('E ');
        }
        await sleep(1200);
      }
      process.stdout.write(`(done ${ok}/${n})`);
    }
  }
  const rows = fs
    .readFileSync(out, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const good = rows.filter((r) => r.ok);
  const um = [...new Set(good.map((r) => r.modelReturned).filter(Boolean))];
  const up = [...new Set(good.map((r) => r.provider).filter(Boolean))];
  fs.writeFileSync(
    man,
    JSON.stringify(
      {
        requestedModel: model,
        nPerCondition: n,
        completedAt: new Date().toISOString(),
        integrity: {
          rows: rows.length,
          validRows: good.length,
          uniqueReturnedModels: um,
          uniqueProviders: up,
        },
      },
      null,
      2,
    ),
  );
  console.log('\n\nDone.');
})();
