/* Récapitulatif de commande sur la page de confirmation.
   L'identifiant de session vient de l'URL de retour Stripe ; c'est le
   serveur qui interroge Stripe et ne renvoie que ce que l'acheteur
   connaît déjà. Rien ici ne prouve un paiement : la preuve, et
   l'émission des billets, passent par le webhook signé. */
(function () {
  'use strict';

  var bloc = document.getElementById('resume');
  if (!bloc) return;

  var session = new URLSearchParams(window.location.search).get('session');
  if (!session) {
    bloc.innerHTML = '<p class="lead">Vos billets vous ont été envoyés par e-mail.</p>';
    return;
  }

  fetch('/api/paiement?session=' + encodeURIComponent(session), {
    headers: { 'Accept': 'application/json' }
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.ok) throw new Error('indisponible');

      if (!d.paye) {
        bloc.innerHTML = '<p class="lead">Votre paiement est en cours de traitement. ' +
          'Vous recevrez vos billets dès sa validation.</p>';
        return;
      }

      var texte = document.createElement('p');
      texte.className = 'lead';
      texte.textContent = d.quantite + ' billet' + (d.quantite > 1 ? 's' : '') +
        ' pour ' + d.evenement + (d.email ? ', envoyé' + (d.quantite > 1 ? 's' : '') +
        ' à ' + d.email : '') + '.';

      var ref = document.createElement('p');
      ref.className = 'commande-ref';
      ref.innerHTML = 'Commande <strong></strong>';
      ref.querySelector('strong').textContent = d.commande;

      bloc.innerHTML = '';
      bloc.appendChild(texte);
      bloc.appendChild(ref);
    })
    .catch(function () {
      bloc.innerHTML = '<p class="lead">Vos billets vous ont été envoyés par e-mail. ' +
        'Le récapitulatif détaillé est momentanément indisponible.</p>';
    });
}());
