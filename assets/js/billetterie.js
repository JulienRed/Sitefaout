/* =========================================================
   RUBIS Événements — billetterie
   ---------------------------------------------------------
   Le navigateur n'envoie que des identifiants et des quantités.
   Les prix affichés ici viennent du serveur et n'ont qu'une
   valeur d'affichage : c'est le catalogue serveur qui fait foi
   au moment du paiement.
   ========================================================= */
(function () {
  'use strict';

  var API_CATALOGUE = '/api/billetterie';
  var API_PAIEMENT  = '/api/paiement';
  var CONTACT       = 'contact@rubis-evenements.fr';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var liste      = $('#liste');
  var chargement = $('#chargement');
  var annonce    = $('#annonce');
  if (!liste) return;

  var panier = {};   /* { evenementId: { categorieId: quantite } } */

  /* ---------------------------------------------------------
     Formatage
     --------------------------------------------------------- */
  var euros = new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2
  });

  function prix(centimes) { return euros.format(centimes / 100); }

  /* L'horaire affiché est celui du lieu, pas celui du visiteur : un gala
     à 19 h à Paris ne doit pas s'afficher « 18 h » pour quelqu'un dont le
     navigateur est réglé sur UTC. */
  var FUSEAU = 'Europe/Paris';

  function dateLisible(debut, fin) {
    var d = new Date(debut);
    var jour = d.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSEAU
    });
    var heures = { hour: '2-digit', minute: '2-digit', timeZone: FUSEAU };
    var texte = jour.charAt(0).toUpperCase() + jour.slice(1) +
                ' · ' + d.toLocaleTimeString('fr-FR', heures);

    if (fin) {
      var f = new Date(fin);
      var memeJour = d.toLocaleDateString('fr-FR', { timeZone: FUSEAU }) ===
                     f.toLocaleDateString('fr-FR', { timeZone: FUSEAU });
      if (memeJour) texte += ' – ' + f.toLocaleTimeString('fr-FR', heures);
    }
    return texte;
  }

  function message(texte, type) {
    annonce.textContent = texte;
    annonce.className = 'billetterie-annonce' + (type ? ' ' + type : '');
    annonce.hidden = !texte;
  }

  /* ---------------------------------------------------------
     Rendu
     --------------------------------------------------------- */
  function carteEvenement(ev) {
    var article = document.createElement('article');
    article.className = 'evenement';
    article.dataset.id = ev.id;

    var complet = ev.restants === 0;
    var indisponible = !ev.ouvert || complet;

    var etat = '';
    if (!ev.ouvert) etat = '<p class="evenement-etat">Ouverture prochaine</p>';
    else if (complet) etat = '<p class="evenement-etat evenement-complet">Complet</p>';
    else if (ev.restants !== null && ev.restants <= 30) {
      etat = '<p class="evenement-etat evenement-tension">Plus que ' + ev.restants + ' places</p>';
    }

    var categories = ev.categories.map(function (c) {
      return '' +
        '<div class="categorie" data-categorie="' + c.id + '">' +
          '<div class="categorie-info">' +
            '<p class="categorie-nom">' + echapper(c.nom) + '</p>' +
            (c.description ? '<p class="categorie-desc">' + echapper(c.description) + '</p>' : '') +
          '</div>' +
          '<p class="categorie-prix">' + prix(c.prix) + '</p>' +
          '<div class="compteur">' +
            '<button type="button" class="js-moins" aria-label="Retirer un billet ' +
              echapper(c.nom) + '"' + (indisponible ? ' disabled' : '') + '>−</button>' +
            '<output class="compteur-valeur" aria-live="off">0</output>' +
            '<button type="button" class="js-plus" data-max="' + c.max_par_commande +
              '" aria-label="Ajouter un billet ' + echapper(c.nom) + '"' +
              (indisponible ? ' disabled' : '') + '>+</button>' +
          '</div>' +
        '</div>';
    }).join('');

    article.innerHTML = '' +
      '<div class="evenement-visuel">' +
        '<img src="assets/img/realisations/' + echapper(ev.visuel || 'gala') + '.svg" alt=""' +
        ' width="800" height="500" loading="lazy" decoding="async">' +
        etat +
      '</div>' +
      '<div class="evenement-corps">' +
        '<p class="pack-tag">' + echapper(dateLisible(ev.date_debut, ev.date_fin)) + '</p>' +
        '<h2>' + echapper(ev.nom) + '</h2>' +
        (ev.sous_titre ? '<p class="evenement-soustitre">' + echapper(ev.sous_titre) + '</p>' : '') +
        '<p class="evenement-lieu">' + echapper(ev.lieu) +
          (ev.adresse ? ' — ' + echapper(ev.adresse) : '') + '</p>' +
        '<p class="evenement-desc">' + echapper(ev.description) + '</p>' +
        '<div class="categories">' + categories + '</div>' +
        '<div class="evenement-pied">' +
          '<p class="evenement-total"><small>Total</small><strong class="js-total">' +
            prix(0) + '</strong></p>' +
          '<button type="button" class="btn btn-primary js-payer"' +
            (indisponible ? ' disabled' : '') + ' disabled>' +
            '<span class="btn-label">Réserver</span>' +
            '<span class="btn-spinner" aria-hidden="true"></span>' +
          '</button>' +
        '</div>' +
      '</div>';

    return article;
  }

  function echapper(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------------
     Panier
     --------------------------------------------------------- */
  function totalEvenement(ev) {
    var lignes = panier[ev.id] || {};
    return ev.categories.reduce(function (somme, c) {
      return somme + (lignes[c.id] || 0) * c.prix;
    }, 0);
  }

  function rafraichir(article, ev) {
    var lignes = panier[ev.id] || {};
    $$('.categorie', article).forEach(function (bloc) {
      var id = bloc.dataset.categorie;
      $('.compteur-valeur', bloc).textContent = lignes[id] || 0;
      $('.js-moins', bloc).disabled = !(lignes[id] > 0);
    });

    var total = totalEvenement(ev);
    $('.js-total', article).textContent = prix(total);

    var payer = $('.js-payer', article);
    var vide = total === 0;
    payer.disabled = vide || !ev.ouvert || ev.restants === 0;
    $('.btn-label', payer).textContent = vide
      ? 'Réserver'
      : 'Réserver — ' + prix(total);
  }

  function brancher(article, ev) {
    article.addEventListener('click', function (e) {
      var plus = e.target.closest('.js-plus');
      var moins = e.target.closest('.js-moins');
      if (!plus && !moins) return;

      var bloc = e.target.closest('.categorie');
      var id = bloc.dataset.categorie;
      panier[ev.id] = panier[ev.id] || {};
      var actuel = panier[ev.id][id] || 0;

      if (plus) {
        var max = parseInt(plus.dataset.max, 10) || 10;
        if (actuel >= max) {
          message('Maximum ' + max + ' billets de cette catégorie par commande.', 'ko');
          return;
        }
        panier[ev.id][id] = actuel + 1;
      } else {
        panier[ev.id][id] = Math.max(0, actuel - 1);
      }

      message('');
      rafraichir(article, ev);
    });

    $('.js-payer', article).addEventListener('click', function () {
      payer(article, ev);
    });
  }

  /* ---------------------------------------------------------
     Paiement
     --------------------------------------------------------- */
  function payer(article, ev) {
    var lignes = panier[ev.id] || {};
    var articles = Object.keys(lignes)
      .filter(function (id) { return lignes[id] > 0; })
      .map(function (id) { return { categorie: id, quantite: lignes[id] }; });

    if (!articles.length) return;

    var bouton = $('.js-payer', article);
    bouton.disabled = true;
    bouton.classList.add('loading');
    $('.btn-label', bouton).textContent = 'Redirection vers le paiement…';
    message('');

    fetch(API_PAIEMENT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ evenement: ev.id, articles: articles })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; })
          .then(function (json) { return { status: res.status, ok: res.ok, json: json }; });
      })
      .then(function (res) {
        if (res.ok && res.json.ok && res.json.url) {
          window.location.href = res.json.url;
          return;
        }
        message(res.json.error ||
          'La réservation n’a pas abouti. Réessayez ou écrivez-nous à ' + CONTACT + '.', 'ko');
        bouton.classList.remove('loading');
        rafraichir(article, ev);
      })
      .catch(function () {
        message('Le service de paiement est injoignable. Écrivez-nous à ' + CONTACT +
                ' et nous réservons vos places manuellement.', 'ko');
        bouton.classList.remove('loading');
        rafraichir(article, ev);
      });
  }

  /* ---------------------------------------------------------
     Démarrage
     --------------------------------------------------------- */
  if (new URLSearchParams(window.location.search).get('annule')) {
    message('Paiement abandonné — aucune somme n’a été prélevée. Votre sélection est à refaire.', 'ko');
  }

  fetch(API_CATALOGUE, { headers: { 'Accept': 'application/json' } })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!data.ok || !data.catalogue) throw new Error('réponse inattendue');
      chargement.hidden = true;

      var evenements = data.catalogue.evenements || [];
      if (!evenements.length) {
        message('Aucun événement n’est ouvert à la réservation pour le moment.', '');
        return;
      }

      evenements.forEach(function (ev) {
        var article = carteEvenement(ev);
        liste.appendChild(article);
        brancher(article, ev);
        rafraichir(article, ev);
      });
    })
    .catch(function () {
      chargement.hidden = true;
      message('La billetterie n’est pas encore accessible. Pour réserver dès maintenant, ' +
              'écrivez-nous à ' + CONTACT + '.', 'ko');
    });

}());
