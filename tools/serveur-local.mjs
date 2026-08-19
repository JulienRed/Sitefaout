/* Serveur de développement — le site complet, API comprise.
   ---------------------------------------------------------------------
   Ouvrir les fichiers HTML directement ne fait pas tourner les fonctions
   serverless : /api/billetterie répond 404 et la page affiche « la
   billetterie n'est pas accessible ». Ce serveur sert les pages ET les
   points d'entrée, sur un seul port.

       npm start          →  http://localhost:8080

   Trois modes, selon ce qui est configuré :

     · sans STRIPE_SECRET_KEY  → paiement SIMULÉ, page locale de
       confirmation, puis webhook signé envoyé au vrai gestionnaire.
       Toute la chaîne s'exécute réellement, sans banque.
     · sans RESEND_API_KEY     → les e-mails ne partent pas : ils sont
       écrits dans .local/emails/ et ouvrables au navigateur.
     · avec les vraies clés     → comportement identique à la production.

   ┌─────────────────────────────────────────────────────────────────┐
   │ Le paiement simulé n'existe QUE dans ce fichier, qui n'est pas   │
   │ déployé. Aucun chemin de production ne permet d'émettre un       │
   │ billet sans passer par Stripe.                                   │
   └─────────────────────────────────────────────────────────────────┘ */

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8080);
const BASE = `http://localhost:${PORT}`;
const BOITE = join(RACINE, '.local', 'emails');

/* --- Valeurs par défaut, uniquement pour le développement ----------- */
const SIMULE_STRIPE = !process.env.STRIPE_SECRET_KEY;
const SIMULE_EMAIL = !process.env.RESEND_API_KEY;

process.env.BILLET_SECRET = process.env.BILLET_SECRET ||
  'developpement-local-cle-de-signature-non-secrete';

/* Le code de production refuse de créer un paiement sans clé Stripe — et il a
   raison. En mode simulé on lui en donne une factice : elle ne sert qu'à
   franchir ce garde-fou, puisque tout appel à api.stripe.com est intercepté
   plus bas et n'atteint jamais le réseau. */
if (SIMULE_STRIPE) process.env.STRIPE_SECRET_KEY = 'sk_simulation_locale';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ||
  'whsec_developpement_local';
process.env.DEVIS_FROM = process.env.DEVIS_FROM || 'EDB Événement <devis@local.test>';
process.env.DEVIS_TO = process.env.DEVIS_TO || 'contact@local.test';
process.env.SITE_NAME = process.env.SITE_NAME || 'EDB Événement';
process.env.SITE_URL = process.env.SITE_URL || BASE;
if (SIMULE_EMAIL) process.env.RESEND_API_KEY = 'developpement-local';

/* --- Doublures réseau ----------------------------------------------- */
const vraiFetch = globalThis.fetch;
let compteurEmails = 0;

globalThis.fetch = async (url, options) => {
  const u = String(url);

  if (SIMULE_EMAIL && u.includes('api.resend.com')) {
    const message = JSON.parse(options.body);
    await mkdir(BOITE, { recursive: true });
    const nom = String(++compteurEmails).padStart(3, '0') + '-' +
      message.subject.replace(/[^\wÀ-ſ -]/g, '').slice(0, 60).trim()
        .replace(/\s+/g, '-').toLowerCase() + '.html';
    await writeFile(join(BOITE, nom),
      `<!doctype html><meta charset="utf-8"><title>${message.subject}</title>` +
      `<p style="font:13px/1.6 system-ui;background:#eee;padding:12px">` +
      `<b>À :</b> ${message.to.join(', ')}<br><b>Objet :</b> ${message.subject}<br>` +
      `<b>Pièces jointes :</b> ${(message.attachments || []).map((a) => a.filename).join(', ') || 'aucune'}` +
      `</p>` + (message.html || `<pre>${message.text}</pre>`), 'utf8');

    console.log(`  ✉  e-mail simulé → .local/emails/${nom}`);
    (message.attachments || []).forEach(async (a) => {
      await writeFile(join(BOITE, a.filename), Buffer.from(a.content, 'base64'));
    });
    return { ok: true, json: async () => ({ id: 'local' }), text: async () => '' };
  }

  if (SIMULE_STRIPE && u.includes('api.stripe.com')) {
    if (u.includes('checkout/sessions?')) {
      return { ok: true, json: async () => ({ data: [...commandes.values()], has_more: false }) };
    }
    const trouve = u.match(/checkout\/sessions\/(cs_[A-Za-z0-9_]+)/);
    if (trouve) {
      const s = commandes.get(trouve[1]);
      return s
        ? { ok: true, json: async () => s }
        : { ok: false, json: async () => ({ error: { message: 'inconnue' } }) };
    }
    return { ok: true, json: async () => creerSessionLocale(options.body) };
  }

  return vraiFetch(url, options);
};

/* --- Sessions de paiement simulées ---------------------------------- */
const commandes = new Map();

function creerSessionLocale(corps) {
  const p = new URLSearchParams(corps);
  const id = 'cs_local_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const session = {
    id,
    payment_status: 'unpaid',
    status: 'open',
    metadata: {
      evenement: p.get('metadata[evenement]'),
      evenement_nom: p.get('metadata[evenement_nom]'),
      quantite: p.get('metadata[quantite]')
    },
    customer_details: { email: null },
    url: `${BASE}/__paiement-simule?session=${id}`
  };
  commandes.set(id, session);
  return session;
}

/* Page qui remplace l'écran de paiement Stripe. */
function pagePaiement(session) {
  const m = session.metadata;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Paiement simulé — développement</title>
<link rel="stylesheet" href="/assets/css/styles.css"></head>
<body><main class="page"><div class="wrap page-narrow">
  <p class="eyebrow">Développement local</p>
  <h1>Paiement simulé</h1>
  <p class="lead">Cet écran remplace la page de paiement Stripe. Aucune banque
  n'est contactée, aucune carte n'est demandée.</p>

  <p class="legal-todo"><strong>Cet écran n'existe pas en production.</strong>
  Il est défini dans <code>tools/serveur-local.mjs</code>, qui n'est jamais
  déployé. Avec une vraie clé Stripe, c'est la page de Stripe qui s'affiche.</p>

  <dl class="legal-list">
    <dt>Événement</dt><dd>${m.evenement_nom}</dd>
    <dt>Billets</dt><dd>${m.quantite}</dd>
  </dl>

  <form method="POST" action="/__paiement-simule" class="devis-form" style="margin-top:2rem">
    <input type="hidden" name="session" value="${session.id}">
    <div class="field">
      <label for="email">E-mail de l'acheteur</label>
      <input type="email" id="email" name="email" value="acheteur@local.test" required>
    </div>
    <button class="btn btn-primary btn-block" type="submit">Simuler un paiement réussi</button>
  </form>

  <p class="merci-contact" style="margin-top:1.4rem">
    <a href="/billetterie.html?annule=1">Simuler un abandon</a>
  </p>
</div></main></body></html>`;
}

/* Après « paiement », on rejoue exactement ce que Stripe enverrait :
   un webhook signé, traité par le vrai gestionnaire. */
async function validerPaiementSimule(idSession, email) {
  const session = commandes.get(idSession);
  if (!session) return null;

  session.payment_status = 'paid';
  session.status = 'complete';
  session.customer_details = { email };

  const charge = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: session }
  });
  const t = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(t + '.' + charge).digest('hex');

  const { traiterWebhook } = require(join(RACINE, 'server/stripe-webhook.js'));
  const resultat = await traiterWebhook(charge, `t=${t},v1=${signature}`);
  console.log(`  ⇢ webhook rejoué → ${resultat.status}`);
  return session;
}

/* --- Modules applicatifs -------------------------------------------- */
const devis = require(join(RACINE, 'server/devis.js'));
const billetterie = require(join(RACINE, 'server/billetterie.js'));
const billets = require(join(RACINE, 'server/billets.js'));
const stripeWebhook = require(join(RACINE, 'server/stripe-webhook.js'));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json'
};

function lireCorps(req) {
  return new Promise((r) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => r(d));
  });
}

const serveur = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const chemin = decodeURIComponent(url.pathname);
  const json = (statut, corps) => {
    res.writeHead(statut, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(corps));
  };

  try {
    /* ---- API ---- */
    if (chemin === '/api/devis' && req.method === 'POST') {
      const r = await devis.handleDevis(JSON.parse(await lireCorps(req) || '{}'),
        { ip: req.socket.remoteAddress });
      console.log(`  → /api/devis ${r.status}`);
      return json(r.status, r.body);
    }

    if (chemin === '/api/billetterie' && req.method === 'GET') {
      const r = await billetterie.obtenirCatalogue();
      return json(r.status, r.body);
    }

    if (chemin === '/api/paiement') {
      if (req.method === 'GET') {
        const r = await billetterie.resumeCommande(url.searchParams.get('session'));
        return json(r.status, r.body);
      }
      const r = await billetterie.creerPaiement(
        JSON.parse(await lireCorps(req) || '{}'), { origine: BASE });
      console.log(`  → /api/paiement ${r.status}`);
      return json(r.status, r.body);
    }

    if (chemin === '/api/stripe-webhook' && req.method === 'POST') {
      const r = await stripeWebhook.traiterWebhook(
        await lireCorps(req), req.headers['stripe-signature']);
      return json(r.status, r.body);
    }

    if (chemin === '/api/verifier-billet' && req.method === 'POST') {
      const d = JSON.parse(await lireCorps(req) || '{}');
      return json(200, billets.verifier(d.code));
    }

    /* ---- écran de paiement simulé ---- */
    if (chemin === '/__paiement-simule') {
      if (!SIMULE_STRIPE) { res.writeHead(404); return res.end('Stripe est configuré.'); }

      if (req.method === 'GET') {
        const session = commandes.get(url.searchParams.get('session'));
        if (!session) { res.writeHead(404); return res.end('Session inconnue.'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(pagePaiement(session));
      }

      const form = new URLSearchParams(await lireCorps(req));
      const session = await validerPaiementSimule(form.get('session'), form.get('email'));
      if (!session) { res.writeHead(404); return res.end('Session inconnue.'); }
      res.writeHead(302, {
        Location: `/billetterie-confirmation.html?session=${session.id}`
      });
      return res.end();
    }

    /* ---- boîte aux lettres locale ---- */
    if (chemin === '/__emails') {
      const { readdir } = await import('node:fs/promises');
      const fichiers = existsSync(BOITE) ? (await readdir(BOITE)).filter((f) => f.endsWith('.html')) : [];
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><title>E-mails simulés</title>` +
        `<body style="font:15px/1.7 system-ui;max-width:720px;margin:40px auto;padding:0 20px">` +
        `<h1>E-mails simulés</h1>` +
        (fichiers.length
          ? '<ul>' + fichiers.reverse().map((f) =>
              `<li><a href="/.local/emails/${encodeURIComponent(f)}">${f}</a></li>`).join('') + '</ul>'
          : '<p>Aucun e-mail pour le moment. Envoyez un devis ou achetez un billet.</p>'));
    }

    /* ---- fichiers ---- */
    const fichier = join(RACINE, chemin.endsWith('/') ? chemin + 'index.html' : chemin);
    if (!fichier.startsWith(RACINE)) { res.writeHead(403); return res.end('Interdit.'); }

    const data = await readFile(fichier);
    res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      try {
        const p404 = await readFile(join(RACINE, '404.html'));
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(p404);
      } catch { /* pas de page 404 */ }
      res.writeHead(404); return res.end('404');
    }
    console.error('  ✗', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
});

serveur.listen(PORT, () => {
  const ligne = (t) => console.log('  ' + t);
  console.log('\n\x1b[1mEDB Événement — serveur de développement\x1b[0m\n');
  ligne(`Site           ${BASE}`);
  ligne(`Billetterie    ${BASE}/billetterie.html`);
  ligne(`Contrôle       ${BASE}/verifier-billet.html`);
  if (SIMULE_EMAIL) ligne(`E-mails        ${BASE}/__emails`);
  console.log('');
  ligne(SIMULE_STRIPE
    ? '\x1b[33mPaiement simulé\x1b[0m — aucune clé Stripe. Le bouton « Réserver »'
    : '\x1b[32mStripe configuré\x1b[0m — paiement réel (mode test si clé sk_test_).');
  if (SIMULE_STRIPE) ligne('               mène à un écran local, puis rejoue un webhook signé.');
  ligne(SIMULE_EMAIL
    ? '\x1b[33mE-mails simulés\x1b[0m — écrits dans .local/emails/, rien n\'est envoyé.'
    : '\x1b[32mResend configuré\x1b[0m — les e-mails partent réellement.');
  console.log('');
});
