/* Contrôle d'accès : vérifie la signature d'un billet côté serveur.
   La clé de signature ne quitte jamais le serveur, donc aucune
   vérification n'est faite ici. */
(function () {
  'use strict';

  var form = document.getElementById('verifForm');
  if (!form) return;

  var champ   = document.getElementById('f-code');
  var bouton  = document.getElementById('verifBtn');
  var verdict = document.getElementById('verdict');
  var erreur  = document.querySelector('.err[data-for="f-code"]');

  /* Un code scanné peut arriver comme URL complète : on ne garde que le code. */
  function extraire(saisie) {
    var texte = String(saisie || '').trim();
    var trouve = texte.match(/EDB-[A-Za-z0-9]+-[A-Za-z0-9]+-\d+-[A-Fa-f0-9]+/);
    return trouve ? trouve[0].toUpperCase() : texte.toUpperCase();
  }

  function afficher(resultat, code) {
    verdict.hidden = false;
    if (resultat.valide) {
      verdict.className = 'verdict verdict-ok';
      verdict.innerHTML = '<p class="verdict-titre">Billet valide</p>' +
        '<dl class="verdict-detail">' +
        '<dt>Commande</dt><dd>' + resultat.commande + '</dd>' +
        '<dt>Billet n°</dt><dd>' + resultat.numero + '</dd>' +
        '<dt>Événement</dt><dd>' + resultat.evenement + '</dd>' +
        '</dl>' +
        '<p class="verdict-note">Notez ce code comme admis : un second passage ne serait pas détecté.</p>';
    } else {
      verdict.className = 'verdict verdict-ko';
      verdict.innerHTML = '<p class="verdict-titre">Billet refusé</p>' +
        '<p class="verdict-note"></p>';
      verdict.querySelector('.verdict-note').textContent = resultat.raison || 'Code non reconnu.';
    }
    champ.select();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = extraire(champ.value);

    if (!code) {
      erreur.textContent = 'Saisissez un code.';
      champ.closest('.field').classList.add('invalid');
      return;
    }
    erreur.textContent = '';
    champ.closest('.field').classList.remove('invalid');

    bouton.disabled = true;
    bouton.classList.add('loading');
    verdict.hidden = true;

    fetch('/api/verifier-billet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ code: code })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { afficher(d, code); })
      .catch(function () {
        afficher({ valide: false, raison: 'Service de vérification injoignable.' }, code);
      })
      .then(function () {
        bouton.disabled = false;
        bouton.classList.remove('loading');
      });
  });
}());
