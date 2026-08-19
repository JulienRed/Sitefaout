/* Adaptateur Vercel — catalogue de la billetterie. */
'use strict';
var { obtenirCatalogue } = require('../server/billetterie');

module.exports = async function (req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
    return;
  }
  var r = await obtenirCatalogue();
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(r.status).json(r.body);
};
