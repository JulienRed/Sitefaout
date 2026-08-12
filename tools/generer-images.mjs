/* Génère les images bitmap dérivées du logo et de l'identité :
     assets/img/og-cover.png        1200 × 630  — aperçu de partage social
     assets/img/favicon-32.png        32 × 32   — repli pour les vieux navigateurs
     assets/img/favicon-180.png      180 × 180  — apple-touch-icon

   Les réseaux sociaux n'affichent pas les SVG en aperçu : sans le PNG
   ci-dessus, chaque partage produit une carte vide.

   Usage : node tools/generer-images.mjs
   Nécessite Playwright (chromium). */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = resolve(RACINE, 'assets/img');
mkdirSync(SORTIE, { recursive: true });

const NOIR = '#0b0c0e';
const ROUGE = '#c8102e';
const ROUGE_CLAIR = '#e2233d';

/* Le rubis, en SVG inline pour rester indépendant du système de fichiers. */
const RUBIS = (taille) => `
<svg viewBox="0 0 100 100" width="${taille}" height="${taille}">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${ROUGE_CLAIR}"/><stop offset="100%" stop-color="#8a0b1f"/>
    </linearGradient>
    <linearGradient id="b" x1=".5" y1="0" x2=".5" y2="1">
      <stop offset="0%" stop-color="${ROUGE}"/><stop offset="100%" stop-color="#6d0817"/>
    </linearGradient>
  </defs>
  <polygon points="34,28 66,28 78,40 22,40" fill="url(#t)"/>
  <polygon points="22,40 78,40 50,86" fill="url(#b)"/>
  <polygon points="22,40 50,40 50,86" fill="#fff" opacity=".07"/>
  <path d="M34 28 H66 L78 40 L50 86 L22 40 Z" fill="none"
        stroke="#e8909c" stroke-opacity=".4" stroke-width="1.1" stroke-linejoin="round"/>
</svg>`;

const POLICE = `file://${resolve(RACINE, 'assets/fonts/inter-latin-variable.woff2')}`;

const STYLE_COMMUN = `
  @font-face{ font-family:"Inter var"; src:url("${POLICE}") format("woff2");
              font-weight:300 700; font-style:normal; }
  *{ margin:0; padding:0; box-sizing:border-box; }
  body{ font-family:"Inter var", system-ui, sans-serif; background:${NOIR}; color:#eef1f5; }
`;

/* ---------- 1. Image de partage 1200 × 630 ---------- */
const OG = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${STYLE_COMMUN}
body{ width:1200px; height:630px; position:relative; overflow:hidden;
      background:linear-gradient(160deg,#12070b,${NOIR} 58%,#070809); }
.grille{ position:absolute; inset:auto 0 -12% 0; height:56%;
  background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);
  background-size:72px 72px; transform:perspective(620px) rotateX(69deg); transform-origin:bottom;
  -webkit-mask-image:linear-gradient(to top,#000,transparent 76%); }
.halo{ position:absolute; width:760px; height:760px; right:-190px; top:-230px; border-radius:50%;
  background:radial-gradient(circle,rgba(200,16,46,.30),transparent 66%); filter:blur(28px); }
.contenu{ position:relative; padding:78px 84px; height:100%;
  display:flex; flex-direction:column; justify-content:space-between; }
.marque{ display:flex; align-items:center; gap:20px; }
.marque strong{ font-size:30px; letter-spacing:.26em; font-weight:700; }
.marque em{ font-style:normal; font-size:18px; letter-spacing:.18em; text-transform:uppercase;
            color:#828a97; display:block; margin-top:4px; }
h1{ font-size:74px; line-height:1.06; letter-spacing:-.035em; font-weight:700; max-width:15ch; }
h1 span{ color:${ROUGE_CLAIR}; }
.pied{ display:flex; align-items:center; justify-content:space-between; }
.pied p{ font-size:23px; color:#9aa3af; letter-spacing:-.01em; }
.puce{ display:flex; gap:12px; }
.puce span{ font-size:17px; color:#eef1f5; border:1px solid #2a2f38; border-radius:4px;
            padding:9px 16px; letter-spacing:.02em; }
.filet{ position:absolute; left:0; right:0; bottom:0; height:6px;
        background:linear-gradient(90deg,${ROUGE},${ROUGE_CLAIR} 45%,transparent); }
.gem{ position:absolute; right:96px; top:196px; opacity:.96;
      filter:drop-shadow(0 24px 60px rgba(200,16,46,.55)); }
</style></head><body>
<div class="grille"></div><div class="halo"></div>
<div class="gem">${RUBIS(238)}</div>
<div class="contenu">
  <div class="marque">
    ${RUBIS(52)}
    <div><strong>RUBIS</strong><em>Événements</em></div>
  </div>
  <h1>Vos événements d'entreprise, <span>de bout en bout</span>.</h1>
  <div class="pied">
    <p>Conception · Production · Régie — Paris &amp; Europe</p>
    <div class="puce"><span>Devis sous 48 h</span><span>480 événements produits</span></div>
  </div>
</div>
<div class="filet"></div>
</body></html>`;

/* ---------- 2. Icônes ---------- */
const ICONE = (taille, fond) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${STYLE_COMMUN}
body{ width:${taille}px; height:${taille}px; display:grid; place-items:center;
      background:${fond}; }
svg{ width:${Math.round(taille * 0.74)}px; height:${Math.round(taille * 0.74)}px; }
</style></head><body>${RUBIS(taille)}</body></html>`;

const navigateur = await chromium.launch();

async function rendre(html, largeur, hauteur, fichier) {
  const page = await navigateur.newPage({
    viewport: { width: largeur, height: hauteur },
    deviceScaleFactor: 1
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const png = await page.screenshot({ type: 'png' });
  writeFileSync(resolve(SORTIE, fichier), png);
  await page.close();
  console.log(`${fichier.padEnd(20)} ${(png.length / 1024).toFixed(1)} Ko`);
}

await rendre(OG, 1200, 630, 'og-cover.png');
await rendre(ICONE(180, NOIR), 180, 180, 'favicon-180.png');
await rendre(ICONE(32, NOIR), 32, 32, 'favicon-32.png');

await navigateur.close();
