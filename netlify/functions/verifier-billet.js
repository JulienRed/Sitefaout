/* Adaptateur Netlify — vérification d'un billet à l'entrée. */
'use strict';
var { verifier } = require('../../server/billets');
var JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS,
             body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' }) };
  }
  var data;
  try { data = JSON.parse(event.body || '{}'); } catch (e) { data = {}; }
  try {
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(verifier(data.code)) };
  } catch (err) {
    console.error('Vérification impossible :', err.message);
    return { statusCode: 503, headers: JSON_HEADERS,
             body: JSON.stringify({ valide: false, raison: 'Service de vérification indisponible.' }) };
  }
};
