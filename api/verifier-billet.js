/* Adaptateur Vercel — vérification d'un billet à l'entrée. */
'use strict';
var { verifier } = require('../server/billets');

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
    return;
  }
  var data = req.body;
  if (typeof data === 'string') {
    try { data = JSON.parse(data || '{}'); } catch (e) { data = {}; }
  }
  try {
    res.status(200).json(verifier((data || {}).code));
  } catch (err) {
    console.error('Vérification impossible :', err.message);
    res.status(503).json({ valide: false, raison: 'Service de vérification indisponible.' });
  }
};
