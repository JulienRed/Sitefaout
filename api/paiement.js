/* Adaptateur Vercel — création de la session de paiement. */
'use strict';
var { creerPaiement, resumeCommande } = require('../server/billetterie');

module.exports = async function (req, res) {
  var origine = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || '');

  if (req.method === 'GET') {
    var r = await resumeCommande(req.query && req.query.session);
    res.status(r.status).json(r.body);
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
    return;
  }

  var data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data || '{}'); }
    catch (e) { res.status(400).json({ ok: false, error: 'Requête invalide.' }); return; }
  }
  var r2 = await creerPaiement(data || {}, { origine: origine });
  res.status(r2.status).json(r2.body);
};
