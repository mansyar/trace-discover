import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)); // spike/tools
const ACCOUNT = '318b4f5a8dbb12ad2921763882a33024';
const token = readFileSync(resolve(here, '..', '.cf_token'), 'utf8').trim();

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : def;
}

const prompt = arg('prompt');
const out = arg('out');
const w = parseInt(arg('w', '1024'), 10);
const h = parseInt(arg('h', '1024'), 10);
const steps = parseInt(arg('steps', '4'), 10);
if (!prompt || !out) {
  console.error('usage: node tools/gen.mjs --prompt "..." --out gen/x.png [--w 1024 --h 1024 --steps 4]');
  process.exit(2);
}

const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function run(body) {
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return { ok: r.ok, status: r.status, text: await r.text() };
}

let res = await run({ prompt, steps, width: w, height: h });
if (!res.ok) res = await run({ prompt, steps }); // retry without size params if unsupported

if (!res.ok) {
  console.error('HTTP', res.status, res.text.slice(0, 500));
  process.exit(1);
}

let b64 = null;
try {
  const j = JSON.parse(res.text);
  b64 = j?.result?.image ?? null;
  if (!b64) console.error('no result.image; result keys:', Object.keys(j?.result ?? j ?? {}).join(','));
} catch {
  /* binary-ish response */
}

const outPath = resolve(here, '..', out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, b64 ? Buffer.from(b64, 'base64') : Buffer.from(res.text, 'binary'));
console.log(`ok ${out} ${readFileSync(outPath).length}B`);
