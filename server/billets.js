/* =========================================================
   Billets : émission et vérification des codes
   ---------------------------------------------------------
   Un billet n'est pas stocké : son code porte sa propre preuve.
   Le code est signé en HMAC-SHA256 avec BILLET_SECRET, donc
   impossible à fabriquer sans la clé, et vérifiable hors ligne
   par le serveur sans base de données.

   Format : RUBIS-<evenement>-<commande>-<n>-<signature>
   Exemple : RUBIS-GALA2026-8F3K2A-01-4B7E9C12

   LIMITE ASSUMÉE — la signature prouve qu'un billet est
   authentique, pas qu'il n'a pas déjà été scanné. Interdire le
   second passage demande un état partagé : voir la note
   « contrôle d'accès » du README.
   ========================================================= */

'use strict';

var crypto = require('crypto');

var ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';   // sans I, L, O, U : illisibles

function secret() {
  var s = process.env.BILLET_SECRET;
  if (!s || s.length < 24) {
    throw new Error('BILLET_SECRET absent ou trop court (24 caractères minimum).');
  }
  return s;
}

/* Identifiant court et lisible, dérivé de la session de paiement :
   deux commandes différentes ne peuvent pas produire le même. */
function referenceCommande(idSession) {
  var brut = crypto.createHash('sha256').update(String(idSession)).digest();
  var out = '';
  for (var i = 0; i < 6; i++) out += ALPHABET[brut[i] % ALPHABET.length];
  return out;
}

function normaliser(texte) {
  return String(texte).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function signature(evenement, commande, numero) {
  var message = normaliser(evenement) + '|' + commande + '|' + numero;
  return crypto.createHmac('sha256', secret())
    .update(message).digest('hex').slice(0, 8).toUpperCase();
}

function emettre(evenementId, idSession, quantite) {
  var commande = referenceCommande(idSession);
  var evenement = normaliser(evenementId).slice(0, 12);
  var billets = [];

  for (var n = 1; n <= quantite; n++) {
    var numero = String(n).padStart(2, '0');
    billets.push({
      numero: n,
      code: ['RUBIS', evenement, commande, numero,
             signature(evenement, commande, numero)].join('-')
    });
  }
  return { commande: commande, billets: billets };
}

/* Vérification en temps constant : comparer deux signatures avec === laisse
   fuir, par le temps de réponse, le nombre de caractères déjà corrects. */
function verifier(code) {
  var morceaux = String(code || '').trim().toUpperCase().split('-');
  if (morceaux.length !== 5 || morceaux[0] !== 'RUBIS') {
    return { valide: false, raison: 'Format de code invalide.' };
  }

  var evenement = morceaux[1], commande = morceaux[2];
  var numero = morceaux[3], fournie = morceaux[4];

  if (!/^[A-Z0-9]{1,12}$/.test(evenement) || !/^[A-Z0-9]{6}$/.test(commande) ||
      !/^\d{2}$/.test(numero) || !/^[A-F0-9]{8}$/.test(fournie)) {
    return { valide: false, raison: 'Format de code invalide.' };
  }

  var attendue = signature(evenement, commande, numero);
  var a = Buffer.from(attendue), b = Buffer.from(fournie);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valide: false, raison: 'Billet non authentique.' };
  }

  return {
    valide: true,
    evenement: evenement,
    commande: commande,
    numero: parseInt(numero, 10)
  };
}

module.exports = { emettre: emettre, verifier: verifier, referenceCommande: referenceCommande };
