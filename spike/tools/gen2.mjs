// Image-to-image generation via Cloudflare Workers AI (FLUX.2 klein).
// Usage: node tools/gen2.mjs --image in.png --prompt "..." --out out.png [--steps 4] [--seed 1] [--strength 0.7] [--model @cf/...]
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const k = a.slice(2);
  if (k.includes('=')) { const [kk, vv] = k.split('='); args[kk] = vv; }
  else args[k] = argv[++i];
}
if (!args.image || !args.prompt || !args.out) {
  console.error('usage: node tools/gen2.mjs --image in.png --prompt "..." --out out.png [--steps 4] [--seed 1] [--strength 0.7] [--model @cf/...]');
  process.exit(1);
}

const token = fs.readFileSync(path.join(import.meta.dirname, '..', '.cf_token'), 'utf8').trim();
const ACCOUNT = '318b4f5a8dbb12ad2921763882a33024';
const MODEL = args.model || '@cf/black-forest-labs/flux-2-klein-4b';

const buf = fs.readFileSync(args.image);
const fd = new FormData();
fd.append('prompt', args.prompt);
fd.append('input_image_0', new Blob([buf], { type: 'image/png' }), path.basename(args.image));
for (const k of ['steps', 'seed', 'strength', 'guidance', 'width', 'height']) {
  if (args[k] !== undefined) fd.append(k, String(args[k]));
}

const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: fd,
});
const text = await res.text();
if (!res.ok) {
  console.error('HTTP', res.status);
  console.error(text.slice(0, 2000));
  process.exit(1);
}
let json;
try { json = JSON.parse(text); } catch { console.error('non-JSON response:', text.slice(0, 600)); process.exit(1); }
const b64 = json?.result?.image;
if (!b64) { console.error('no image in response:', JSON.stringify(json).slice(0, 1200)); process.exit(1); }
fs.writeFileSync(args.out, Buffer.from(b64, 'base64'));
console.log('wrote', args.out, fs.statSync(args.out).size, 'bytes');
