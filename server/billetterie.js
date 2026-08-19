/* =========================================================
   Billetterie : catalogue et création du paiement
   ---------------------------------------------------------
   Règle non négociable : le navigateur n'envoie que des
   identifiants et des quantités. Les prix, les libellés et les
   totaux sont relus dans data/billetterie.json côté serveur.
   Un panier qui arriverait avec « prix : 1 centime » serait
   simplement ignoré.

   Le paiement passe par Stripe Checkout : la page de paiement
   est hébergée par Stripe, aucune donnée de carte ne transite
   par ce site ni par ce serveur.

   Variables d'environnement :
     STRIPE_SECRET_KEY   clé secrète Stripe (sk_live_… / sk_test_…)
     SITE_URL            base des URL de retour, ex. https://www.rubis-evenements.fr
   ========================================================= */

'use strict';

var catalogue = require('../data/billetterie.json');

var MAX_ARTICLES = 10;          /* lignes distinctes dans un panier */
var MAX_QUANTITE_TOTALE = 40;   /* billets par commande */

function evenementPar(id) {
  return catalogue.evenements.find(function (e) { return e.id === id; }) || null;
}

/* ---------------------------------------------------------
   Catalogue public — jamais d'information interne
   --------------------------------------------------------- */
function cataloguePublic(restants) {
  return {
    devise: catalogue.devise,
    evenements: catalogue.evenements.map(function (e) {
      return {
        id: e.id,
        nom: e.nom,
        sous_titre: e.sous_titre,
        date_debut: e.date_debut,
        date_fin: e.date_fin,
        lieu: e.lieu,
        adresse: e.adresse,
        description: e.description,
        visuel: e.visuel,
        ouvert: e.ouvert === true,
        restants: restants ? (restants[e.id] === undefined ? null : restants[e.id]) : null,
        categories: e.categories.map(function (c) {
          return {
            id: c.id, nom: c.nom, prix: c.prix,
            description: c.description,
            max_par_commande: c.max_par_commande || 10
          };
        })
      };
    })
  };
}

/* ---------------------------------------------------------
   Appels Stripe — en form-urlencoded, l'API Stripe n'accepte
   pas de JSON. Pas de SDK : une dépendance de moins.
   --------------------------------------------------------- */
function encoder(objet, prefixe, sortie) {
  sortie = sortie || [];
  Object.keys(objet).forEach(function (cle) {
    var valeur = objet[cle];
    if (valeur === undefined || valeur === null) return;
    var nom = prefixe ? prefixe + '[' + cle + ']' : cle;
    if (typeof valeur === 'object') encoder(valeur, nom, sortie);
    else sortie.push(encodeURIComponent(nom) + '=' + encodeURIComponent(valeur));
  });
  return sortie;
}

async function stripe(chemin, methode, corps) {
  var cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error('STRIPE_SECRET_KEY absente.');

  var options = {
    method: methode,
    headers: {
      'Authorization': 'Bearer ' + cle,
      'Stripe-Version': '2024-06-20'
    }
  };
  if (corps) {
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = encoder(corps).join('&');
  }

  var res = await fetch('https://api.stripe.com/v1/' + chemin, options);
  var json = await res.json();
  if (!res.ok) {
    throw new Error('Stripe ' + res.status + ' : ' +
      ((json.error && json.error.message) || 'erreur inconnue'));
  }
  return json;
}

/* ---------------------------------------------------------
   Places restantes
   ---------------------------------------------------------
   Sans base de données, Stripe fait office de registre : on
   compte les billets des sessions déjà payées. Suffisant pour
   des volumes de cet ordre ; au-delà, il faudra un vrai stock.
   --------------------------------------------------------- */
async function placesRestantes(evenementId) {
  var evenement = evenementPar(evenementId);
  if (!evenement || !evenement.quota) return null;

  var vendus = 0;
  var apres = null;

  for (var page = 0; page < 10; page++) {
    var params = 'limit=100&status=complete';
    if (apres) params += '&starting_after=' + apres;

    var lot = await stripe('checkout/sessions?' + params, 'GET');
    lot.data.forEach(function (session) {
      if (session.payment_status !== 'paid') return;
      if (!session.metadata || session.metadata.evenement !== evenementId) return;
      vendus += parseInt(session.metadata.quantite || '0', 10) || 0;
    });

    if (!lot.has_more || !lot.data.length) break;
    apres = lot.data[lot.data.length - 1].id;
  }

  return Math.max(0, evenement.quota - vendus);
}

/* ---------------------------------------------------------
   Validation du panier
   --------------------------------------------------------- */
function validerPanier(donnees) {
  var evenement = evenementPar(String(donnees.evenement || ''));
  if (!evenement) return { erreur: 'Événement inconnu.' };
  if (!evenement.ouvert) return { erreur: 'La billetterie de cet événement n’est pas ouverte.' };

  if (new Date(evenement.date_debut).getTime() < Date.now()) {
    return { erreur: 'Cet événement est passé.' };
  }

  var articles = Array.isArray(donnees.articles) ? donnees.articles : [];
  if (!articles.length) return { erreur: 'Votre panier est vide.' };
  if (articles.length > MAX_ARTICLES) return { erreur: 'Trop de lignes dans le panier.' };

  var lignes = [], quantiteTotale = 0, total = 0;

  for (var i = 0; i < articles.length; i++) {
    var demande = articles[i] || {};
    var categorie = evenement.categories.find(function (c) { return c.id === demande.categorie; });
    if (!categorie) return { erreur: 'Catégorie de billet inconnue.' };

    var quantite = parseInt(demande.quantite, 10);
    if (!Number.isInteger(quantite) || quantite < 1) {
      return { erreur: 'Quantité invalide.' };
    }
    if (quantite > (categorie.max_par_commande || 10)) {
      return { erreur: 'Maximum ' + (categorie.max_par_commande || 10) +
                       ' « ' + categorie.nom + ' » par commande.' };
    }

    quantiteTotale += quantite;
    total += categorie.prix * quantite;

    lignes.push({
      price_data: {
        currency: catalogue.devise,
        unit_amount: categorie.prix,            /* prix du catalogue, jamais du client */
        product_data: {
          name: evenement.nom + ' — ' + categorie.nom,
          description: (categorie.description || '').slice(0, 300)
        }
      },
      quantity: quantite
    });
  }

  if (quantiteTotale > MAX_QUANTITE_TOTALE) {
    return { erreur: 'Maximum ' + MAX_QUANTITE_TOTALE + ' billets par commande.' };
  }

  return { evenement: evenement, lignes: lignes, quantite: quantiteTotale, total: total };
}

/* ---------------------------------------------------------
   Points d'entrée
   --------------------------------------------------------- */
async function obtenirCatalogue() {
  var restants = {};
  for (var i = 0; i < catalogue.evenements.length; i++) {
    var e = catalogue.evenements[i];
    if (!e.ouvert) { restants[e.id] = null; continue; }
    try {
      restants[e.id] = await placesRestantes(e.id);
    } catch (err) {
      console.error('Places restantes indisponibles pour ' + e.id + ' :', err.message);
      restants[e.id] = null;       /* on n'empêche pas l'affichage pour autant */
    }
  }
  return { status: 200, body: { ok: true, catalogue: cataloguePublic(restants) } };
}

async function creerPaiement(donnees, contexte) {
  donnees = donnees || {};

  var verif = validerPanier(donnees);
  if (verif.erreur) return { status: 422, body: { ok: false, error: verif.erreur } };

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY absente : billetterie non configurée.');
    return { status: 503, body: { ok: false, error: 'La billetterie n’est pas encore ouverte.' } };
  }

  /* Contrôle du quota juste avant paiement. Ce n'est pas une réservation :
     deux acheteurs simultanés sur la dernière place peuvent tous deux
     passer. Le remboursement reste possible, et un vrai stock demanderait
     une base de données. */
  try {
    var restants = await placesRestantes(verif.evenement.id);
    if (restants !== null && verif.quantite > restants) {
      return {
        status: 409,
        body: { ok: false, error: restants > 0
          ? 'Il ne reste que ' + restants + ' place(s) pour cet événement.'
          : 'Cet événement est complet.' }
      };
    }
  } catch (err) {
    console.error('Contrôle de quota impossible :', err.message);
  }

  var base = (process.env.SITE_URL || '').replace(/\/+$/, '') ||
             (contexte && contexte.origine) || '';

  try {
    var session = await stripe('checkout/sessions', 'POST', {
      mode: 'payment',
      locale: 'fr',
      success_url: base + '/billetterie-confirmation.html?session={CHECKOUT_SESSION_ID}',
      cancel_url: base + '/billetterie.html?annule=1',
      line_items: verif.lignes,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      metadata: {
        evenement: verif.evenement.id,
        evenement_nom: verif.evenement.nom.slice(0, 100),
        quantite: String(verif.quantite)
      },
      payment_intent_data: {
        description: 'Billetterie — ' + verif.evenement.nom.slice(0, 80)
      }
    });

    return { status: 200, body: { ok: true, url: session.url } };
  } catch (err) {
    console.error('Création de la session de paiement impossible :', err.message);
    return { status: 502, body: { ok: false, error: 'Le paiement est momentanément indisponible.' } };
  }
}

/* Résumé d'une commande, pour la page de confirmation. On ne renvoie que
   ce que l'acheteur connaît déjà — jamais l'identifiant de paiement. */
async function resumeCommande(idSession) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(String(idSession || ''))) {
    return { status: 400, body: { ok: false, error: 'Référence de commande invalide.' } };
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return { status: 503, body: { ok: false, error: 'Service indisponible.' } };
  }

  try {
    var session = await stripe('checkout/sessions/' + idSession, 'GET');
    if (session.payment_status !== 'paid') {
      return { status: 200, body: { ok: true, paye: false } };
    }
    var billets = require('./billets');
    return {
      status: 200,
      body: {
        ok: true,
        paye: true,
        evenement: (session.metadata && session.metadata.evenement_nom) || '',
        quantite: parseInt((session.metadata && session.metadata.quantite) || '0', 10),
        email: (session.customer_details && session.customer_details.email) || '',
        commande: billets.referenceCommande(session.id)
      }
    };
  } catch (err) {
    console.error('Résumé de commande indisponible :', err.message);
    return { status: 404, body: { ok: false, error: 'Commande introuvable.' } };
  }
}

module.exports = {
  obtenirCatalogue: obtenirCatalogue,
  creerPaiement: creerPaiement,
  resumeCommande: resumeCommande,
  validerPanier: validerPanier,
  cataloguePublic: cataloguePublic,
  stripe: stripe
};
