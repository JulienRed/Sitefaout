/* =========================================================
   Webhook Stripe : émission des billets après paiement
   ---------------------------------------------------------
   C'est Stripe qui nous prévient qu'un paiement a abouti, pas
   le navigateur : un acheteur peut fermer l'onglet avant le
   retour, et surtout rien de ce qui vient du navigateur ne
   prouve un paiement.

   La signature de chaque requête est vérifiée avant toute
   action. Sans cela, n'importe qui pourrait poster un faux
   événement « paiement réussi » et se faire émettre des billets.

   Variables d'environnement :
     STRIPE_WEBHOOK_SECRET  secret de signature (whsec_…)
     BILLET_SECRET          clé de signature des billets
     RESEND_API_KEY, DEVIS_FROM, DEVIS_TO, SITE_URL
   ========================================================= */

'use strict';

var crypto = require('crypto');
var billets = require('./billets');

var TOLERANCE_SECONDES = 300;   /* rejoue au-delà de 5 minutes : refusé */

/* ---------------------------------------------------------
   Vérification de signature
   --------------------------------------------------------- */
function verifierSignature(corpsBrut, enTete) {
  var secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { ok: false, raison: 'STRIPE_WEBHOOK_SECRET absent.' };
  if (!enTete) return { ok: false, raison: 'Signature absente.' };

  var horodatage = null;
  var signatures = [];
  String(enTete).split(',').forEach(function (partie) {
    var paire = partie.trim().split('=');
    if (paire[0] === 't') horodatage = paire[1];
    if (paire[0] === 'v1') signatures.push(paire[1]);
  });

  if (!horodatage || !signatures.length) {
    return { ok: false, raison: 'Signature mal formée.' };
  }

  var age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(horodatage, 10));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDES) {
    return { ok: false, raison: 'Horodatage hors tolérance.' };
  }

  var attendue = crypto.createHmac('sha256', secret)
    .update(horodatage + '.' + corpsBrut).digest('hex');

  var valide = signatures.some(function (fournie) {
    var a = Buffer.from(attendue), b = Buffer.from(String(fournie));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });

  return valide ? { ok: true } : { ok: false, raison: 'Signature invalide.' };
}

/* ---------------------------------------------------------
   Envoi des billets
   --------------------------------------------------------- */
function echapper(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function qrPng(texte) {
  /* Le QR est produit à l'émission et joint au message : les images
     distantes sont bloquées par la plupart des messageries, une pièce
     jointe non. Si la librairie manque, on n'échoue pas — le code
     alphanumérique imprimé dans le message suffit à entrer. */
  try {
    var QRCode = require('qrcode');
    var url = await QRCode.toDataURL(texte, {
      margin: 1, width: 480, errorCorrectionLevel: 'M',
      color: { dark: '#0b0c0eff', light: '#ffffffff' }
    });
    return url.split(',')[1];
  } catch (err) {
    console.error('QR non généré :', err.message);
    return null;
  }
}

function corpsEmail(infos) {
  var lignes = infos.billets.map(function (b) {
    return '<tr>' +
      '<td style="padding:10px 0;border-bottom:1px solid #e5e7eb;' +
      'font:400 14px/1.5 Arial,sans-serif;color:#6b7280;">Billet ' +
      b.numero + ' / ' + infos.billets.length + '</td>' +
      '<td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;' +
      'font:700 15px/1.5 monospace;color:#111317;letter-spacing:.06em;">' +
      echapper(b.code) + '</td></tr>';
  }).join('');

  return '<div style="background:#f5f6f8;padding:24px;">' +
    '<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;">' +
      '<div style="background:#111317;padding:18px 24px;">' +
        '<p style="margin:0;font:700 14px/1.4 Arial,sans-serif;color:#fff;letter-spacing:.18em;">' +
        echapper(infos.siteName.toUpperCase()) + '</p>' +
        '<p style="margin:4px 0 0;font:400 13px/1.4 Arial,sans-serif;color:#c8102e;">' +
        'Vos billets</p>' +
      '</div>' +
      '<div style="padding:24px;font:400 14px/1.7 Arial,sans-serif;color:#111317;">' +
        '<p style="margin:0 0 16px;">Bonjour,</p>' +
        '<p style="margin:0 0 20px;">Votre paiement est confirmé. Voici vos billets pour ' +
        '<strong>' + echapper(infos.evenement) + '</strong>.</p>' +
        '<p style="margin:0 0 6px;font-weight:700;">Commande ' + echapper(infos.commande) + '</p>' +
        '<table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;">' +
        lignes + '</table>' +
        '<p style="margin:22px 0 0;padding:12px 16px;background:#f5f6f8;' +
        'font:400 13px/1.6 Arial,sans-serif;">' +
        'Présentez le QR code joint à ce message, ou communiquez le code du billet ' +
        'à l’entrée. Chaque billet n’admet qu’une personne.</p>' +
        '<p style="margin:20px 0 0;color:#6b7280;font-size:13px;">' +
        echapper(infos.siteName) + ' — ' + echapper(infos.contact) + '</p>' +
      '</div>' +
    '</div></div>';
}

async function envoyerBillets(session) {
  var email = session.customer_details && session.customer_details.email;
  if (!email) { console.error('Session sans e-mail acheteur :', session.id); return; }

  var quantite = parseInt((session.metadata && session.metadata.quantite) || '0', 10);
  if (!quantite) { console.error('Session sans quantité :', session.id); return; }

  var evenementId = (session.metadata && session.metadata.evenement) || 'evenement';
  var evenementNom = (session.metadata && session.metadata.evenement_nom) || 'votre événement';

  var emission = billets.emettre(evenementId, session.id, quantite);
  var siteName = process.env.SITE_NAME || 'Rubis Événements';
  var contact = process.env.DEVIS_TO || '';

  /* Un QR par billet, joint au message. */
  var pieces = [];
  for (var i = 0; i < emission.billets.length; i++) {
    var b = emission.billets[i];
    var png = await qrPng(b.code);
    if (png) {
      pieces.push({ filename: 'billet-' + b.code + '.png', content: png });
    }
  }

  var corps = corpsEmail({
    evenement: evenementNom, commande: emission.commande,
    billets: emission.billets, siteName: siteName, contact: contact
  });

  var texte = 'Vos billets pour ' + evenementNom + '\n\nCommande ' + emission.commande +
    '\n\n' + emission.billets.map(function (b) {
      return 'Billet ' + b.numero + ' : ' + b.code;
    }).join('\n') + '\n\n' + siteName;

  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.DEVIS_FROM,
      to: [email],
      reply_to: contact || undefined,
      subject: 'Vos billets — ' + evenementNom,
      html: corps,
      text: texte,
      attachments: pieces.length ? pieces : undefined
    })
  });

  if (!res.ok) {
    var detail = await res.text();
    throw new Error('Resend ' + res.status + ' : ' + detail.slice(0, 300));
  }

  /* Copie interne : sans base de données, la boîte de l'agence est le
     seul registre des commandes. */
  if (contact) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.DEVIS_FROM,
        to: [contact],
        subject: 'Billetterie — ' + quantite + ' billet(s) — ' + evenementNom,
        text: 'Commande ' + emission.commande + '\nAcheteur : ' + email +
              '\nÉvénement : ' + evenementNom + '\nQuantité : ' + quantite +
              '\n\n' + emission.billets.map(function (b) { return b.code; }).join('\n')
      })
    }).catch(function (err) { console.error('Copie interne non envoyée :', err.message); });
  }

  console.log('Billets émis pour la commande ' + emission.commande +
              ' (' + quantite + ' billet(s)).');
}

/* ---------------------------------------------------------
   Point d'entrée
   --------------------------------------------------------- */
async function traiterWebhook(corpsBrut, enTeteSignature) {
  var verif = verifierSignature(corpsBrut, enTeteSignature);
  if (!verif.ok) {
    console.error('Webhook rejeté :', verif.raison);
    return { status: 400, body: { ok: false, error: verif.raison } };
  }

  var evenement;
  try {
    evenement = JSON.parse(corpsBrut);
  } catch (err) {
    return { status: 400, body: { ok: false, error: 'Charge utile illisible.' } };
  }

  if (evenement.type !== 'checkout.session.completed') {
    return { status: 200, body: { ok: true, ignore: evenement.type } };
  }

  var session = evenement.data && evenement.data.object;
  if (!session || session.payment_status !== 'paid') {
    return { status: 200, body: { ok: true, ignore: 'paiement non abouti' } };
  }

  try {
    await envoyerBillets(session);
  } catch (err) {
    /* Un 500 fait réessayer Stripe : c'est exactement ce qu'on veut si
       l'envoi a échoué, l'acheteur a payé et attend ses billets. */
    console.error('Émission des billets impossible :', err.message);
    return { status: 500, body: { ok: false, error: 'Émission impossible.' } };
  }

  return { status: 200, body: { ok: true } };
}

module.exports = { traiterWebhook: traiterWebhook, verifierSignature: verifierSignature };
