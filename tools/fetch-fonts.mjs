// Одноразовый скрипт: скачивает woff2 из Google Fonts и делает локальный fonts.css.
// Запуск: node tools/fetch-fonts.mjs   (нужен только при обновлении шрифтов)
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'assets/fonts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Martian+Mono:wght@400;500&display=swap';

// Сайт на русском — латиница и кириллица нужны, остальное (греческий, вьетнамский) отбрасываем.
const KEEP = new Set(['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']);

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

// Блоки идут как «/* subset */\n@font-face { ... }»
const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)];

await mkdir(OUT_DIR, { recursive: true });

const out = [];
let kept = 0;
for (const [, subset, rule] of blocks) {
  if (!KEEP.has(subset)) continue;

  const family = /font-family:\s*'([^']+)'/.exec(rule)[1];
  const weight = /font-weight:\s*(\d+)/.exec(rule)[1];
  const url = /url\((https:[^)]+\.woff2)\)/.exec(rule)[1];

  const slug = family.toLowerCase().replace(/\s+/g, '-');
  const file = `${slug}-${weight}-${subset}.woff2`;

  const bytes = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  await writeFile(resolve(OUT_DIR, file), bytes);

  out.push(rule.replace(/url\(https:[^)]+\.woff2\)/, `url(./${file})`).replace(/@font-face\s*\{/, `/* ${subset} */\n@font-face {`));
  kept++;
}

await writeFile(resolve(OUT_DIR, 'fonts.css'), out.join('\n\n') + '\n', 'utf8');
console.log(`ok: ${kept} woff2 -> assets/fonts/`);
