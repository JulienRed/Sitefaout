/* Adaptateur Vercel Functions — voir server/devis.js pour la logique. */
'use strict';

var handleDevis = require('../server/devis').handleDevis;

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
    return;
  }

  var data = req.body;

  /* Selon la configuration, le corps peut arriver déjà analysé ou en texte brut. */
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data || '{}');
    } catch (err) {
      res.status(400).json({ ok: false, error: 'Requête invalide.' });
      return;
    }
  }

  var ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
           (req.socket && req.socket.remoteAddress) || '';

  var result = await handleDevis(data || {}, { ip: ip });
  res.status(result.status).json(result.body);
};
