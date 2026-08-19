/* Adaptateur Netlify — création de la session de paiement. */
'use strict';
var { creerPaiement, resumeCommande } = require('../../server/billetterie');
var JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

exports.handler = async function (event) {
  var h = event.headers || {};
  var origine = 'https://' + (h['x-forwarded-host'] || h.host || '');

  if (event.httpMethod === 'GET') {
    var r = await resumeCommande((event.queryStringParameters || {}).session);
    return { statusCode: r.status, headers: JSON_HEADERS, body: JSON.stringify(r.body) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JSON_HEADERS,
             body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' }) };
  }

  var data;
  try { data = JSON.parse(event.body || '{}'); }
  catch (e) {
    return { statusCode: 400, headers: JSON_HEADERS,
             body: JSON.stringify({ ok: false, error: 'Requête invalide.' }) };
  }
  var r2 = await creerPaiement(data, { origine: origine });
  return { statusCode: r2.status, headers: JSON_HEADERS, body: JSON.stringify(r2.body) };
};
