/* =========================================================
   Traitement d'une demande de devis — logique partagée
   ---------------------------------------------------------
   Ce module ne dépend d'aucun framework : il reçoit un corps
   de requête déjà analysé et renvoie { status, body }.
   Les adaptateurs (netlify/functions/devis.js, api/devis.js)
   se contentent de le brancher sur leur plateforme.

   Variables d'environnement attendues :
     RESEND_API_KEY    clé API Resend (https://resend.com)
     DEVIS_FROM        expéditeur vérifié, ex. "Rubis Événements <devis@rubis-evenements.fr>"
     DEVIS_TO          destinataire interne, ex. "contact@rubis-evenements.fr"
     DEVIS_BCC         copie cachée interne (facultatif)
     TURNSTILE_SECRET  clé secrète Cloudflare Turnstile (facultatif mais recommandé)
     SITE_NAME         nom affiché dans les e-mails (défaut : Rubis Événements)
   ========================================================= */

'use strict';

var PACKS = [
  'Pack Essentiel',
  'Pack Sur-mesure',
  'À définir ensemble'
];

var LABELS = {
  nom: 'Nom',
  fonction: 'Fonction',
  societe: 'Société',
  email: 'E-mail',
  telephone: 'Téléphone',
  pack: 'Type d’événement',
  date_evenement: 'Date envisagée',
  participants: 'Nombre de participants',
  ville: 'Ville / région',
  budget: 'Budget prévisionnel',
  message: 'Projet'
};

/* ---------------------------------------------------------
   Utilitaires
   --------------------------------------------------------- */

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* En-tête d'e-mail : on interdit tout retour à la ligne pour
   éviter qu'une valeur saisie n'injecte un en-tête supplémentaire. */
function safeHeader(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
}

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Pièce jointe : formats bureautiques uniquement, 3 Mo maximum.
   Au-delà, le corps encodé dépasse la limite de charge utile des
   plateformes serverless. */
var EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
var TAILLE_MAX = 3 * 1024 * 1024;

/* Le nom arrive du navigateur : on ne garde que le nom de base, sans
   chemin ni caractère exotique, pour qu'il ne puisse rien traverser. */
function nomSur(nom) {
  var base = String(nom).split(/[\\/]/).pop();
  base = base.replace(/[^\w .()\u00C0-\u017F-]/g, '_').slice(-120);
  return base || 'piece-jointe';
}

function validerFichier(f) {
  if (!f || typeof f !== 'object') return { ok: true, fichier: null };

  var nom = nomSur(f.nom || '');
  var ext = (nom.split('.').pop() || '').toLowerCase();
  if (EXTENSIONS.indexOf(ext) === -1) {
    return { ok: false, message: 'Format de pièce jointe non accepté.' };
  }

  var contenu = typeof f.contenu === 'string' ? f.contenu.replace(/\s/g, '') : '';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(contenu) || !contenu) {
    return { ok: false, message: 'Pièce jointe illisible.' };
  }

  /* Taille réelle déduite du base64, sans décoder : 4 caractères = 3 octets. */
  var octets = Math.floor(contenu.length * 3 / 4);
  if (octets > TAILLE_MAX) {
    return { ok: false, message: 'Pièce jointe trop lourde (3 Mo maximum).' };
  }

  return { ok: true, fichier: { filename: nom, content: contenu, octets: octets } };
}

/* Limiteur simple, par instance. En environnement serverless les
   instances sont recyclées : c'est un garde-fou, pas une protection
   complète — Turnstile reste la vraie barrière anti-robot. */
var hits = new Map();
var WINDOW_MS = 10 * 60 * 1000;
var MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  if (!ip) return false;
  var now = Date.now();
  var list = (hits.get(ip) || []).filter(function (t) { return now - t < WINDOW_MS; });
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

/* ---------------------------------------------------------
   Validation
   --------------------------------------------------------- */

function validate(data) {
  var errors = {};

  var nom = str(data.nom);
  if (nom.length < 2 || nom.length > 120) errors.nom = 'Merci d’indiquer votre nom.';

  var societe = str(data.societe);
  if (societe.length < 2 || societe.length > 160) {
    errors.societe = 'Merci d’indiquer le nom de votre société.';
  }

  var email = str(data.email);
  if (!EMAIL_RE.test(email) || email.length > 180) {
    errors.email = 'Merci d’indiquer une adresse e-mail valide.';
  }

  var pack = str(data.pack);
  if (PACKS.indexOf(pack) === -1) {
    errors.pack = 'Merci de sélectionner un type d’événement.';
  }

  var message = str(data.message);
  if (message.length < 10) errors.message = 'Décrivez votre projet en quelques lignes.';
  if (message.length > 5000) errors.message = 'Message trop long (5 000 caractères maximum).';

  var consentement = str(data.consentement);
  if (consentement !== 'Oui' && data.consentement !== true) {
    errors.consentement = 'Votre accord est nécessaire pour traiter la demande.';
  }

  var telephone = str(data.telephone);
  if (telephone && !/^[+0-9\s().-]{6,20}$/.test(telephone)) {
    errors.telephone = 'Numéro de téléphone invalide.';
  }

  var participants = str(data.participants);
  if (participants && !/^\d{1,6}$/.test(participants)) {
    errors.participants = 'Indiquez un nombre de participants valide.';
  }

  var date = str(data.date_evenement);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.date_evenement = 'Date invalide.';
  }

  ['fonction', 'ville', 'budget'].forEach(function (key) {
    if (str(data[key]).length > 160) errors[key] = 'Valeur trop longue.';
  });

  return errors;
}

/* ---------------------------------------------------------
   Turnstile (Cloudflare)
   --------------------------------------------------------- */

/* Renvoie l'un de :
     'humain'     — jeton vérifié par Cloudflare
     'refuse'     — jeton absent ou invalide : la demande est rejetée
     'inconnu'    — Turnstile non configuré, ou service injoignable

   'inconnu' laisse passer la demande — on ne perd pas un prospect parce que
   Cloudflare est en panne — mais l'accusé de réception, lui, ne partira pas :
   voir la note sur l'usage en relais dans handleDevis(). */
async function verifyTurnstile(token, ip) {
  var secret = process.env.TURNSTILE_SECRET;
  if (!secret) return 'inconnu';
  if (!token) return 'refuse';

  var params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', token);
  if (ip) params.set('remoteip', ip);

  try {
    var res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    var json = await res.json();
    return json.success === true ? 'humain' : 'refuse';
  } catch (err) {
    console.error('Turnstile injoignable :', err.message);
    return 'inconnu';
  }
}

/* ---------------------------------------------------------
   Composition des e-mails
   --------------------------------------------------------- */

function rows(data) {
  return Object.keys(LABELS).map(function (key) {
    var value = str(data[key]) || '—';
    return '<tr>' +
      '<th style="text-align:left;padding:8px 16px 8px 0;vertical-align:top;' +
      'font:600 13px/1.5 Arial,sans-serif;color:#6b7280;white-space:nowrap;">' +
      escapeHtml(LABELS[key]) + '</th>' +
      '<td style="padding:8px 0;font:400 14px/1.6 Arial,sans-serif;color:#111317;">' +
      escapeHtml(value).replace(/\n/g, '<br>') + '</td>' +
      '</tr>';
  }).join('');
}

function textRecap(data) {
  return Object.keys(LABELS).map(function (key) {
    return LABELS[key] + ' : ' + (str(data[key]) || '—');
  }).join('\n');
}

function internalEmail(data, siteName, piece) {
  var lignePiece = piece
    ? '<p style="margin:18px 0 0;padding:10px 14px;border:1px solid #e5e7eb;' +
      'font:400 13px/1.6 Arial,sans-serif;color:#111317;">' +
      'Pièce jointe : <strong>' + escapeHtml(piece.filename) + '</strong> (' +
      (piece.octets / 1024).toFixed(0) + ' Ko)</p>'
    : '';
  return '<div style="background:#f5f6f8;padding:24px;">' +
    '<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;">' +
      '<div style="background:#111317;padding:18px 24px;">' +
        '<p style="margin:0;font:700 14px/1.4 Arial,sans-serif;color:#fff;letter-spacing:.18em;">' +
        escapeHtml(siteName.toUpperCase()) + '</p>' +
        '<p style="margin:4px 0 0;font:400 13px/1.4 Arial,sans-serif;color:#c8102e;">' +
        'Nouvelle demande de devis</p>' +
      '</div>' +
      '<div style="padding:24px;">' +
        '<table style="width:100%;border-collapse:collapse;">' + rows(data) + '</table>' +
        lignePiece +
        '<p style="margin:24px 0 0;font:400 12px/1.6 Arial,sans-serif;color:#6b7280;">' +
        'Répondez directement à ce message pour joindre le demandeur.</p>' +
      '</div>' +
    '</div></div>';
}

function confirmationEmail(data, siteName, replyTo) {
  var prenom = escapeHtml(str(data.nom).split(' ')[0] || '');
  return '<div style="background:#f5f6f8;padding:24px;">' +
    '<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;">' +
      '<div style="background:#111317;padding:18px 24px;">' +
        '<p style="margin:0;font:700 14px/1.4 Arial,sans-serif;color:#fff;letter-spacing:.18em;">' +
        escapeHtml(siteName.toUpperCase()) + '</p>' +
      '</div>' +
      '<div style="padding:24px;font:400 14px/1.7 Arial,sans-serif;color:#111317;">' +
        '<p style="margin:0 0 16px;">Bonjour ' + prenom + ',</p>' +
        '<p style="margin:0 0 16px;">Nous avons bien reçu votre demande de devis. ' +
        'Un chef de projet l’étudie et revient vers vous <strong>sous 48 h ouvrées</strong> ' +
        'avec une proposition chiffrée, détaillée poste par poste.</p>' +
        '<p style="margin:0 0 8px;font-weight:700;">Récapitulatif de votre demande</p>' +
        '<table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;">' +
        rows(data) + '</table>' +
        '<p style="margin:24px 0 0;">Une précision à ajouter ? Répondez simplement à ce message.</p>' +
        '<p style="margin:16px 0 0;color:#6b7280;font-size:13px;">' +
        escapeHtml(siteName) + ' — ' + escapeHtml(replyTo) + '</p>' +
      '</div>' +
    '</div></div>';
}

/* ---------------------------------------------------------
   Envoi via Resend
   --------------------------------------------------------- */

async function sendEmail(payload) {
  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    var detail = await res.text();
    throw new Error('Resend ' + res.status + ' : ' + detail.slice(0, 300));
  }
  return res.json();
}

/* ---------------------------------------------------------
   Point d'entrée
   --------------------------------------------------------- */

async function handleDevis(body, context) {
  context = context || {};
  var ip = context.ip || '';
  var data = body || {};

  /* 1. Pot de miel : un robot a rempli le champ caché.
        On renvoie un succès pour ne rien lui apprendre. */
  if (str(data.site_web)) {
    return { status: 200, body: { ok: true } };
  }

  /* 2. Limitation de débit */
  if (rateLimited(ip)) {
    return {
      status: 429,
      body: { ok: false, error: 'Trop de demandes envoyées. Réessayez dans quelques minutes.' }
    };
  }

  /* 3. Anti-robot Cloudflare Turnstile */
  var verification = await verifyTurnstile(str(data.turnstile_token), ip);
  if (verification === 'refuse') {
    return {
      status: 403,
      body: { ok: false, error: 'Vérification anti-robot échouée. Rechargez la page et réessayez.' }
    };
  }

  /* 4. Validation métier */
  var errors = validate(data);

  var verifFichier = validerFichier(data.fichier);
  if (!verifFichier.ok) errors.fichier = verifFichier.message;

  if (Object.keys(errors).length) {
    return { status: 422, body: { ok: false, errors: errors } };
  }

  /* 5. Configuration serveur */
  var from = process.env.DEVIS_FROM;
  var to = process.env.DEVIS_TO;
  if (!process.env.RESEND_API_KEY || !from || !to) {
    console.error('Configuration manquante : RESEND_API_KEY, DEVIS_FROM ou DEVIS_TO.');
    return {
      status: 500,
      body: { ok: false, error: 'Le service d’envoi n’est pas configuré.' }
    };
  }

  var siteName = process.env.SITE_NAME || 'Rubis Événements';
  var sujet = 'Demande de devis — ' + safeHeader(str(data.pack)) +
              ' — ' + safeHeader(str(data.societe));

  /* 6. E-mail interne — bloquant : c'est lui qui porte la demande.
        La pièce jointe n'accompagne que ce message : le prospect a
        déjà son propre fichier, inutile de le lui renvoyer. */
  var piece = verifFichier.fichier;
  try {
    await sendEmail({
      from: from,
      to: [to],
      bcc: process.env.DEVIS_BCC ? [process.env.DEVIS_BCC] : undefined,
      reply_to: safeHeader(str(data.email)),
      subject: sujet,
      html: internalEmail(data, siteName, piece),
      text: 'Nouvelle demande de devis\n\n' + textRecap(data) +
            (piece ? '\n\nPièce jointe : ' + piece.filename : ''),
      attachments: piece
        ? [{ filename: piece.filename, content: piece.content }]
        : undefined
    });
  } catch (err) {
    console.error('Envoi interne impossible :', err.message);
    return {
      status: 502,
      body: { ok: false, error: 'L’envoi a échoué. Merci de réessayer ou de nous écrire directement.' }
    };
  }

  /* 7. Accusé de réception au prospect.

        Attention : cet e-mail part vers une adresse fournie par l'appelant et
        reprend son texte libre. Envoyé sans condition, il transforme le
        formulaire en relais : n'importe qui peut faire parvenir le message de
        son choix à la victime de son choix, expédié depuis notre domaine
        vérifié — donc avec notre réputation et notre crédibilité.

        On ne l'envoie donc que si Turnstile a confirmé un humain. Sans
        Turnstile configuré, ou s'il est injoignable, la demande arrive bien
        dans la boîte interne mais aucun message ne part vers l'extérieur.

        Non bloquant par ailleurs : la demande est déjà arrivée. */
  if (verification !== 'humain') {
    if (!process.env.TURNSTILE_SECRET) {
      console.warn('Accusé de réception non envoyé : TURNSTILE_SECRET absent. ' +
                   'Configurez Turnstile pour activer la réponse automatique.');
    }
    return { status: 200, body: { ok: true, accuse: false } };
  }

  try {
    await sendEmail({
      from: from,
      to: [safeHeader(str(data.email))],
      reply_to: to,
      subject: 'Votre demande de devis — ' + siteName,
      html: confirmationEmail(data, siteName, to),
      text: 'Bonjour,\n\nNous avons bien reçu votre demande de devis et revenons vers vous ' +
            'sous 48 h ouvrées.\n\n' + textRecap(data) + '\n\n' + siteName + ' — ' + to
    });
  } catch (err) {
    console.error('Accusé de réception non envoyé :', err.message);
  }

  return { status: 200, body: { ok: true } };
}

module.exports = { handleDevis: handleDevis, validate: validate, PACKS: PACKS };
