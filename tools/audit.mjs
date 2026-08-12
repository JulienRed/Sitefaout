/* Audit automatisé du site — rejoue les contrôles qui, sinon, ne seraient
   faits qu'à la main et finiraient par se perdre.

     1. contrastes WCAG AA sur le rendu réel de chaque page
     2. cibles tactiles de 44 × 44 px minimum
     3. absence de débordement horizontal en 375, 768, 1024 et 1440 px
     4. liens internes morts
     5. images sans alt ni dimensions
     6. erreurs JavaScript
     7. balisage JSON-LD analysable

   Usage : node tools/audit.mjs
   Sortie non nulle si un contrôle échoue — le workflow CI s'en sert. */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.json': 'application/json'
};

const echecs = [];
const rate = (page, message) => echecs.push(`${page} — ${message}`);

/* ---------- serveur statique minimal ---------- */
const serveur = createServer(async (req, res) => {
  const chemin = decodeURIComponent(req.url.split('?')[0]);
  const fichier = join(RACINE, chemin.endsWith('/') ? chemin + 'index.html' : chemin);
  try {
    const data = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});
await new Promise((r) => serveur.listen(PORT, r));

/* ---------- pages à contrôler ---------- */
const pages = ['/index.html', '/merci.html', '/mentions-legales.html',
               '/confidentialite.html', '/404.html'];
if (existsSync(join(RACINE, 'packs'))) {
  for (const f of await readdir(join(RACINE, 'packs'))) {
    if (f.endsWith('.html')) pages.push('/packs/' + f);
  }
}

const navigateur = await chromium.launch();

/* ---------- 1 à 3, 5 à 7 : contrôles par page ---------- */
for (const chemin of pages) {
  const page = await navigateur.newPage({ viewport: { width: 1440, height: 1000 } });
  const erreursJs = [];
  page.on('pageerror', (e) => erreursJs.push(e.message));

  const reponse = await page.goto(BASE + chemin, { waitUntil: 'load' });
  if (!reponse.ok()) { rate(chemin, `statut HTTP ${reponse.status()}`); await page.close(); continue; }

  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach((e) => e.classList.add('visible'));
  });
  await page.waitForTimeout(350);

  /* contrastes */
  const contrastes = await page.evaluate(() => {
    const L = (c) => {
      const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    /* compose une couleur semi-transparente sur son fond */
    const fond = (el) => {
      let n = el, pile = [];
      while (n) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'transparent') {
          const m = c.match(/[\d.]+/g).map(Number);
          const a = m.length === 4 ? m[3] : 1;
          if (a > 0) { pile.push([m[0], m[1], m[2], a]); if (a === 1) break; }
        }
        n = n.parentElement;
      }
      pile.push([11, 12, 14, 1]);
      let [r, g, b] = pile[pile.length - 1];
      for (let i = pile.length - 2; i >= 0; i--) {
        const [pr, pg, pb, pa] = pile[i];
        r = pr * pa + r * (1 - pa); g = pg * pa + g * (1 - pa); b = pb * pa + b * (1 - pa);
      }
      return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    };
    const ratio = (a, b) => {
      const la = L(a), lb = L(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    const mauvais = [];
    document.querySelectorAll('body *').forEach((el) => {
      const texte = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!texte) return;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return;
      if (s.webkitTextFillColor === 'rgba(0, 0, 0, 0)') return;
      const taille = parseFloat(s.fontSize), poids = +s.fontWeight || 400;
      const requis = taille >= 24 || (taille >= 18.66 && poids >= 700) ? 3 : 4.5;
      const r = ratio(s.color, fond(el));
      if (r < requis) {
        mauvais.push(`${el.tagName.toLowerCase()}.${el.className || '—'} ${r.toFixed(2)} < ${requis}`);
      }
    });
    return mauvais;
  });
  contrastes.forEach((c) => rate(chemin, `contraste insuffisant : ${c}`));

  /* images */
  const images = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('img').forEach((im) => {
      if (im.alt === null) out.push(`${im.src} sans attribut alt`);
      if (!im.getAttribute('width') || !im.getAttribute('height')) {
        out.push(`${im.getAttribute('src')} sans dimensions explicites`);
      }
    });
    return out;
  });
  images.forEach((i) => rate(chemin, `image : ${i}`));

  /* JSON-LD */
  const jsonld = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent));
  jsonld.forEach((bloc, i) => {
    try { JSON.parse(bloc); } catch (e) { rate(chemin, `JSON-LD ${i + 1} invalide : ${e.message}`); }
  });

  /* débordement horizontal + cibles tactiles */
  for (const largeur of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.waitForTimeout(200);
    const deborde = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1);
    if (deborde) rate(chemin, `débordement horizontal en ${largeur} px`);
  }

  const tactile = await navigateur.newPage({
    viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true
  });
  await tactile.goto(BASE + chemin);
  await tactile.waitForTimeout(300);
  const petites = await tactile.evaluate(() => {
    const out = [];
    document.querySelectorAll('a, button, summary, input[type=checkbox]').forEach((el) => {
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (!b.width || el.offsetParent === null || s.pointerEvents === 'none') return;
      if (el.closest('.nav') && !document.getElementById('nav')?.classList.contains('open')) return;

      /* Exception « inline » de WCAG 2.5.8 : un lien inséré dans une phrase
         suit le flux du texte, l'agrandir casserait l'interlignage. Seules
         les cibles autonomes sont contrôlées. */
      const enLigne = s.display.startsWith('inline') &&
        [...(el.parentElement?.childNodes || [])]
          .some((n) => n.nodeType === 3 && n.textContent.trim());
      if (enLigne) return;

      if (b.height < 44 || b.width < 44) {
        out.push(`${(el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)} ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
    });
    return out;
  });
  petites.forEach((t) => rate(chemin, `cible tactile sous 44 px : ${t}`));
  await tactile.close();

  erreursJs.forEach((e) => rate(chemin, `erreur JavaScript : ${e}`));
  await page.close();
}

/* ---------- 4 : liens internes ---------- */
{
  const page = await navigateur.newPage();
  const vus = new Set();
  for (const chemin of pages) {
    await page.goto(BASE + chemin);
    const liens = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && !/^(https?:|mailto:|tel:|#)/.test(h)));
    for (const lien of liens) {
      const cible = new URL(lien, BASE + chemin).pathname;
      if (vus.has(cible)) continue;
      vus.add(cible);
      const r = await page.request.get(BASE + cible);
      if (!r.ok()) rate(chemin, `lien mort : ${lien} (${r.status()})`);
    }
  }
  await page.close();
}

await navigateur.close();
serveur.close();

/* ---------- verdict ---------- */
if (echecs.length) {
  console.error(`\n✗ ${echecs.length} problème(s) détecté(s) :\n`);
  echecs.forEach((e) => console.error('  • ' + e));
  process.exit(1);
}
console.log(`✓ ${pages.length} pages contrôlées, aucun problème détecté.`);
