// Gera os ícones PNG do PWA a partir do desenho vetorial. Uso: npm run icons -w apps/web
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/icons");
await mkdir(out, { recursive: true });

// Passaporte com globo; `scale` encolhe o desenho para caber na zona segura dos ícones "maskable"
const art = (scale = 1) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="136" y="96" width="240" height="320" rx="28" fill="#F3F5EC"/>
    <circle cx="256" cy="226" r="66" fill="none" stroke="#2F6F4E" stroke-width="18"/>
    <path d="M190 226h132M256 160c-26 40-26 92 0 132M256 160c26 40 26 92 0 132" fill="none" stroke="#2F6F4E" stroke-width="12"/>
    <rect x="186" y="336" width="140" height="18" rx="9" fill="#C97C1D"/>
  </g>`;

const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>`);

const rounded = svg(`<rect width="512" height="512" rx="112" fill="#2F6F4E"/>${art()}`);
const fullBleed = svg(`<rect width="512" height="512" fill="#2F6F4E"/>${art(0.78)}`);
// Selo da notificação (Android usa só o canal alfa): silhueta branca
const badge = svg(`
  <rect x="136" y="96" width="240" height="320" rx="28" fill="#fff"/>
  <circle cx="256" cy="226" r="66" fill="none" stroke="#000" stroke-width="22"/>
  <path d="M190 226h132" stroke="#000" stroke-width="16"/>
  <rect x="186" y="336" width="140" height="22" rx="11" fill="#000"/>`);

const jobs = [
  ["icon-192.png", rounded, 192],
  ["icon-512.png", rounded, 512],
  ["maskable-512.png", fullBleed, 512],
  ["apple-touch-icon.png", fullBleed, 180],
  ["favicon-32.png", rounded, 32],
];
for (const [name, src, size] of jobs) {
  await sharp(src).resize(size, size).png().toFile(path.join(out, name));
}
// badge: branco onde há desenho, transparente no resto
await sharp(badge)
  .resize(96, 96)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    for (let i = 0; i < data.length; i += 4) {
      const white = data[i] > 128 && data[i + 3] > 0;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = white ? 255 : 0;
    }
    return sharp(data, { raw: info }).png().toFile(path.join(out, "badge-96.png"));
  });

console.log("Ícones gerados em", out);
