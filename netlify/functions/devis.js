/* Adaptateur Netlify Functions — voir server/devis.js pour la logique. */
'use strict';

var handleDevis = require('../../server/devis').handleDevis;

var JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: Object.assign({ Allow: 'POST' }, JSON_HEADERS),
      body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' })
    };
  }

  var data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ ok: false, error: 'Requête invalide.' })
    };
  }

  var headers = event.headers || {};
  var ip = headers['x-nf-client-connection-ip'] ||
           (headers['x-forwarded-for'] || '').split(',')[0].trim();

  var result = await handleDevis(data, { ip: ip });

  return {
    statusCode: result.status,
    headers: JSON_HEADERS,
    body: JSON.stringify(result.body)
  };
};
