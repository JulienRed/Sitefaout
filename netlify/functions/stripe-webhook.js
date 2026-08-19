/* Adaptateur Netlify — webhook Stripe.
   event.body arrive brut, sauf encodage base64 signalé par isBase64Encoded. */
'use strict';
var { traiterWebhook } = require('../../server/stripe-webhook');
var JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS,
             body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' }) };
  }
  var brut = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');

  var signature = (event.headers || {})['stripe-signature'];
  var r = await traiterWebhook(brut, signature);
  return { statusCode: r.status, headers: JSON_HEADERS, body: JSON.stringify(r.body) };
};
