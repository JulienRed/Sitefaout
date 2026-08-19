/* Banc d'essai de la billetterie.
   ---------------------------------------------------------------------
   Rejoue la chaîne complète — catalogue, panier, paiement, webhook,
   émission, vérification — sans toucher à Stripe ni envoyer d'e-mail.
   Stripe et Resend sont remplacés par des doublures qui enregistrent ce
   qu'on leur envoie, ce qui permet de vérifier ce qui *serait* parti.

   Il produit aussi un code de billet valide, à coller dans
   verifier-billet.html pour essayer le contrôle d'accès.

       node tools/tester-billetterie.mjs

   Pour tester avec le vrai Stripe (mode test), voir la section
   « Essayer avec Stripe » du README : carte 4242 4242 4242 4242. */

import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* --- Environnement de test, jamais de vraies clés ------------------- */
process.env.BILLET_SECRET = process.env.BILLET_SECRET ||
  'banc-essai-cle-de-signature-non-secrete';
process.env.STRIPE_SECRET_KEY = 'sk_banc_essai';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_banc_essai';
process.env.RESEND_API_KEY = 'banc_essai';
process.env.DEVIS_FROM = 'EDB Événement <devis@exemple.test>';
process.env.DEVIS_TO = 'contact@exemple.test';
process.env.SITE_NAME = 'EDB Événement';
process.env.SITE_URL = 'https://exemple.test';

/* --- Doublures ------------------------------------------------------ */
const envois = { stripe: [], emails: [] };
const SESSION = 'cs_test_banc_essai_0001';

globalThis.fetch = async (url, options) => {
  const u = String(url);

  if (u.includes('api.stripe.com')) {
    envois.stripe.push({ url: u, corps: options?.body });
    if (u.includes('checkout/sessions?')) {
      return { ok: true, json: async () => ({ data: [], has_more: false }) };
    }
    if (/checkout\/sessions\/cs_/.test(u)) {
      return { ok: true, json: async () => sessionPayee() };
    }
    return {
      ok: true,
      json: async () => ({ id: SESSION, url: 'https://checkout.stripe.com/c/pay/' + SESSION })
    };
  }

  if (u.includes('api.resend.com')) {
    envois.emails.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ id: 'email_test' }), text: async () => '' };
  }

  return { ok: true, json: async () => ({}), text: async () => '' };
};

function sessionPayee() {
  return {
    id: SESSION,
    payment_status: 'paid',
    metadata: {
      evenement: evenement.id,
      evenement_nom: evenement.nom,
      quantite: String(QUANTITE)
    },
    customer_details: { email: 'acheteur@exemple.test' }
  };
}

/* --- Modules testés ------------------------------------------------- */
const catalogue = require(resolve(RACINE, 'data/billetterie.json'));
const billetterie = require(resolve(RACINE, 'server/billetterie.js'));
const billets = require(resolve(RACINE, 'server/billets.js'));
const webhook = require(resolve(RACINE, 'server/stripe-webhook.js'));

const evenement = catalogue.evenements.find((e) => e.ouvert);
const categorie = evenement.categories[0];
const QUANTITE = 2;

/* --- Petit cadre de test -------------------------------------------- */
let reussis = 0, echoues = 0;
const titre = (t) => console.log('\n\x1b[1m── ' + t + ' ' + '─'.repeat(Math.max(0, 54 - t.length)) + '\x1b[0m');
function verifier(libelle, condition, detail) {
  if (condition) { reussis++; console.log('  \x1b[32m✓\x1b[0m ' + libelle + (detail ? '  \x1b[2m' + detail + '\x1b[0m' : '')); }
  else { echoues++; console.log('  \x1b[31m✗\x1b[0m ' + libelle + (detail ? '  ' + detail : '')); }
}

console.log('\n\x1b[1mBanc d\'essai de la billetterie\x1b[0m');
console.log('\x1b[2mStripe et Resend sont simulés : aucun paiement, aucun e-mail réel.\x1b[0m');

/* --- 1. Catalogue --------------------------------------------------- */
titre('1. Catalogue');
const cat = await billetterie.obtenirCatalogue();
verifier('le catalogue répond', cat.status === 200);
verifier('les événements sont exposés',
  cat.body.catalogue.evenements.length === catalogue.evenements.length,
  cat.body.catalogue.evenements.length + ' événement(s)');
verifier('aucun quota interne n\'est exposé',
  !JSON.stringify(cat.body).includes('"quota"'));

/* --- 2. Le prix du client est ignoré -------------------------------- */
titre('2. Le prix envoyé par le navigateur est ignoré');
const truque = billetterie.validerPanier({
  evenement: evenement.id,
  articles: [{ categorie: categorie.id, quantite: 1, prix: 1, unit_amount: 1 }]
});
verifier('le prix retenu est celui du catalogue',
  truque.lignes[0].price_data.unit_amount === categorie.prix,
  categorie.prix + ' centimes, pas 1');

/* --- 3. Paniers refusés --------------------------------------------- */
titre('3. Paniers refusés');
const refus = [
  ['événement inconnu', { evenement: 'inconnu', articles: [{ categorie: categorie.id, quantite: 1 }] }],
  ['catégorie inconnue', { evenement: evenement.id, articles: [{ categorie: 'inconnue', quantite: 1 }] }],
  ['quantité négative', { evenement: evenement.id, articles: [{ categorie: categorie.id, quantite: -5 }] }],
  ['quantité non entière', { evenement: evenement.id, articles: [{ categorie: categorie.id, quantite: 1.5 }] }],
  ['au-delà du maximum', { evenement: evenement.id, articles: [{ categorie: categorie.id, quantite: 999 }] }],
  ['panier vide', { evenement: evenement.id, articles: [] }]
];
for (const [libelle, panier] of refus) {
  const r = billetterie.validerPanier(panier);
  verifier(libelle + ' → refusé', Boolean(r.erreur), r.erreur);
}
const ferme = catalogue.evenements.find((e) => !e.ouvert);
if (ferme) {
  const r = billetterie.validerPanier({
    evenement: ferme.id, articles: [{ categorie: ferme.categories[0].id, quantite: 1 }]
  });
  verifier('billetterie fermée → refusée', Boolean(r.erreur), r.erreur);
}

/* --- 4. Création du paiement ---------------------------------------- */
titre('4. Création du paiement');
envois.stripe = [];
const paiement = await billetterie.creerPaiement({
  evenement: evenement.id,
  articles: [{ categorie: categorie.id, quantite: QUANTITE }]
}, {});
verifier('une session est créée', paiement.status === 200 && Boolean(paiement.body.url));
const envoye = envois.stripe.find((a) => a.corps);
const montant = decodeURIComponent(envoye.corps).match(/unit_amount\]=(\d+)/)?.[1];
verifier('le montant transmis vient du catalogue',
  Number(montant) === categorie.prix, montant + ' centimes');
verifier('la quantité est portée en métadonnée',
  decodeURIComponent(envoye.corps).includes('quantite]=' + QUANTITE));

/* --- 5. Webhook : la signature fait foi ------------------------------ */
titre('5. Webhook — seule une signature valide émet des billets');
const charge = JSON.stringify({
  type: 'checkout.session.completed',
  data: { object: sessionPayee() }
});
const maintenant = Math.floor(Date.now() / 1000);
const signer = (t) => createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
  .update(t + '.' + charge).digest('hex');

envois.emails = [];
verifier('sans signature → refusé',
  (await webhook.traiterWebhook(charge, null)).status === 400);
verifier('signature falsifiée → refusé',
  (await webhook.traiterWebhook(charge, `t=${maintenant},v1=${'0'.repeat(64)}`)).status === 400);
const vieux = maintenant - 900;
verifier('signature périmée → refusé',
  (await webhook.traiterWebhook(charge, `t=${vieux},v1=${signer(vieux)}`)).status === 400);
verifier('aucun billet émis par les tentatives refusées', envois.emails.length === 0);

envois.emails = [];
const accepte = await webhook.traiterWebhook(charge, `t=${maintenant},v1=${signer(maintenant)}`);
verifier('signature valide → accepté', accepte.status === 200);
verifier('l\'acheteur reçoit ses billets',
  envois.emails.some((m) => m.to.includes('acheteur@exemple.test')));
verifier('l\'agence reçoit une copie',
  envois.emails.some((m) => m.to.includes('contact@exemple.test')));

const messageAcheteur = envois.emails.find((m) => m.to.includes('acheteur@exemple.test'));
verifier('un QR par billet est joint',
  (messageAcheteur.attachments || []).length === QUANTITE,
  (messageAcheteur.attachments || []).length + ' pièce(s) jointe(s)');
const codes = messageAcheteur.text.match(/EDB-[A-Z0-9-]+/g) || [];
verifier('autant de codes que de billets', codes.length === QUANTITE);
verifier('les codes sont tous distincts', new Set(codes).size === codes.length);

/* --- 6. Contrôle d'accès -------------------------------------------- */
titre('6. Contrôle d\'accès');
const bon = codes[0];
verifier('un billet émis est reconnu', billets.verifier(bon).valide === true);
const falsifie = bon.slice(0, -1) + (bon.slice(-1) === 'A' ? 'B' : 'A');
verifier('une signature modifiée est rejetée', billets.verifier(falsifie).valide === false);
verifier('un code inventé est rejeté',
  billets.verifier('EDB-XXXX-ABCDEF-01-DEADBEEF').valide === false);
verifier('un code mal formé est rejeté', billets.verifier('bonjour').valide === false);

/* --- 7. Résumé de commande ------------------------------------------ */
titre('7. Résumé de commande');
const resume = await billetterie.resumeCommande(SESSION);
verifier('le résumé est disponible', resume.status === 200 && resume.body.paye === true);
verifier('l\'identifiant de paiement n\'est pas exposé',
  !JSON.stringify(resume.body).includes(SESSION));

/* --- Verdict -------------------------------------------------------- */
console.log('\n' + '─'.repeat(58));
console.log(`  ${reussis} contrôle(s) réussi(s), ${echoues} échec(s)`);

if (!echoues) {
  console.log('\n\x1b[1mÀ essayer à la main\x1b[0m');
  console.log('  1. Ouvrez verifier-billet.html et collez ce code :');
  console.log('\n     \x1b[1m' + bon + '\x1b[0m\n');
  console.log('     (valide uniquement avec BILLET_SECRET=' +
              process.env.BILLET_SECRET + ')');
  console.log('  2. Modifiez un caractère : le billet doit être refusé.');
}
console.log('');

process.exit(echoues ? 1 : 0);
