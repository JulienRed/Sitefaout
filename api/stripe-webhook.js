/* Adaptateur Vercel — webhook Stripe.
   Le corps doit rester brut : la signature porte sur les octets exacts,
   un JSON réanalysé puis resérialisé ne correspondrait plus. */
'use strict';
var { traiterWebhook } = require('../server/stripe-webhook');

module.exports.config = { api: { bodyParser: false } };

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
    return;
  }

  var morceaux = [];
  for await (var m of req) morceaux.push(m);
  var brut = Buffer.concat(morceaux).toString('utf8');

  var r = await traiterWebhook(brut, req.headers['stripe-signature']);
  res.status(r.status).json(r.body);
};
