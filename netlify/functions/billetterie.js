/* Adaptateur Netlify — catalogue de la billetterie. */
'use strict';
var { obtenirCatalogue } = require('../../server/billetterie');
var JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: JSON_HEADERS,
             body: JSON.stringify({ ok: false, error: 'Méthode non autorisée.' }) };
  }
  var r = await obtenirCatalogue();
  return {
    statusCode: r.status,
    headers: Object.assign({ 'Cache-Control': 'public, max-age=60' }, JSON_HEADERS),
    body: JSON.stringify(r.body)
  };
};
