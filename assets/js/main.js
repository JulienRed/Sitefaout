/* =========================================================
   EDB Événement — scripts
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     CONFIGURATION
     ---------------------------------------------------------
     API_ENDPOINT
       URL de la fonction qui envoie le devis par e-mail
       (server/devis.js, déployé via netlify/functions ou api/).
       Si elle est injoignable — site publié sans fonctions, panne
       du service — le formulaire bascule automatiquement sur le
       client mail du visiteur, pré-rempli vers CONTACT_EMAIL.
       Mettre '' pour forcer le mode mailto:.

     TURNSTILE_SITE_KEY
       Clé publique Cloudflare Turnstile. Laissée vide, aucune
       ressource tierce n'est chargée et seul le pot de miel
       protège le formulaire. La clé secrète correspondante se
       renseigne côté serveur (TURNSTILE_SECRET).

     SUCCESS_PAGE
       Page de confirmation après un envoi réussi — c'est elle qui
       rend la conversion mesurable. '' pour rester sur place.

     ANALYTICS_DOMAIN
       Domaine déclaré dans Plausible, par exemple
       'edb-evenement.fr'. Renseigné, le script de mesure est
       chargé et l'envoi d'un devis est compté comme objectif.
       Plausible ne dépose aucun cookie : pas de bandeau de
       consentement, et la politique de confidentialité reste
       exacte. Vide, aucune mesure, aucune requête tierce.

     RDV_URL
       Lien de prise de rendez-vous (Cal.com, Calendly…). Renseigné,
       un bouton apparaît à côté du formulaire. Vide, rien ne
       s'affiche.
     --------------------------------------------------------- */
  var CONFIG = {
    API_ENDPOINT:      '/api/devis',
    TURNSTILE_SITE_KEY: '',
    SUCCESS_PAGE:      'merci.html',
    CONTACT_EMAIL:     'contact@edb-evenement.fr',
    ANALYTICS_DOMAIN:  '',
    RDV_URL:           '',

    /* Date d'ouverture visée par le compte à rebours du bandeau, au format
       'AAAA-MM-JJ' ou 'AAAA-MM-JJTHH:MM'.

       DATE PROVISOIRE — à remplacer par la vraie. Elle doit être fixe :
       un décompte recalculé à chaque visite ne décroîtrait jamais. */
    OUVERTURE:         '2028-09-01T09:00'
  };

  /* ---------------------------------------------------------
     Mesure d'audience sans cookie (Plausible)
     --------------------------------------------------------- */
  if (CONFIG.ANALYTICS_DOMAIN) {
    var mesure = document.createElement('script');
    mesure.defer = true;
    mesure.setAttribute('data-domain', CONFIG.ANALYTICS_DOMAIN);
    mesure.src = 'https://plausible.io/js/script.outbound-links.js';
    document.head.appendChild(mesure);
    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  }

  function objectif(nom, options) {
    if (window.plausible) window.plausible(nom, options);
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* =========================================================
     0. Bandeau d'annonce
     ---------------------------------------------------------
     Sa hauteur est publiée dans --annonce-h pour que l'en-tête
     fixe et les ancres internes se décalent d'autant, quelle
     que soit la longueur du texte une fois replié sur mobile.
     ========================================================= */
  (function annonce() {
    var barre = $('#annonceHaut');
    if (!barre) return;

    /* La hauteur du bandeau est publiée en variable CSS : l'en-tête fixe et
       les ancres internes s'en servent pour se décaler. Elle change quand le
       texte se replie, d'où l'observation continue. */
    function mesurer() {
      document.documentElement.style.setProperty(
        '--annonce-h', barre.offsetHeight + 'px');
    }
    mesurer();
    window.addEventListener('resize', mesurer);
    if (window.ResizeObserver) new ResizeObserver(mesurer).observe(barre);

    var bloc = $('#compteRebours');
    if (!bloc) return;

    var cible = new Date(CONFIG.OUVERTURE);
    if (isNaN(cible)) { bloc.remove(); return; }

    /* Date en clair pour les lecteurs d'écran : le décompte lui-même est
       masqué, l'annoncer à chaque seconde serait inutilisable. */
    var texte = $('#compteTexte');
    if (texte) {
      /* En français le premier du mois s'écrit « 1er », pas « 1 ». */
      var jour = cible.getDate();
      texte.textContent = 'Ouverture prévue le ' + (jour === 1 ? '1er' : jour) + ' ' +
        cible.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + '.';
    }

    var champs = {};
    $$('b[data-unite]', bloc).forEach(function (el) {
      champs[el.getAttribute('data-unite')] = el;
    });

    function poser(unite, valeur, largeur) {
      var el = champs[unite];
      if (!el) return;
      var rendu = String(valeur).padStart(largeur, '0');
      if (el.textContent !== rendu) el.textContent = rendu;
    }

    function ouvert() {
      bloc.remove();
      var libelle = $('.annonce-texte strong', barre);
      if (libelle) libelle.textContent = 'L’entreprise est ouverte';
      barre.classList.add('annonce-ouvert');
      if (texte) texte.textContent = '';
      mesurer();
    }

    function battre() {
      var reste = cible.getTime() - Date.now();
      if (reste <= 0) { ouvert(); return false; }

      var secondes = Math.floor(reste / 1000);
      poser('jours', Math.floor(secondes / 86400), 1);
      poser('heures', Math.floor(secondes / 3600) % 24, 2);
      poser('minutes', Math.floor(secondes / 60) % 60, 2);
      poser('secondes', secondes % 60, 2);
      return true;
    }

    /* Mouvement réduit : on garde le décompte mais on cesse de faire
       clignoter les secondes, et on ne rafraîchit qu'à la minute. */
    var periode = reduceMotion ? 60000 : 1000;
    if (reduceMotion) {
      var sec = bloc.querySelector('.cr-secondes');
      if (sec) sec.remove();
    }

    var minuteur = null;
    function demarrer() {
      if (minuteur) return;
      if (battre()) minuteur = window.setInterval(function () {
        if (!battre()) { window.clearInterval(minuteur); minuteur = null; }
      }, periode);
    }
    function arreter() {
      if (minuteur) { window.clearInterval(minuteur); minuteur = null; }
    }

    /* Inutile de compter dans un onglet que personne ne regarde. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') arreter();
      else { battre(); demarrer(); }
    });

    demarrer();
    mesurer();
  }());

  /* =========================================================
     1. Header : fond au scroll + barre de progression
     ========================================================= */
  var header   = $('.site-header');
  var progress = $('#progress');

  if (header && progress) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle('scrolled', y > 24);

      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? Math.min(y / h, 1) * 100 : 0) + '%';
    }, { passive: true });
    window.dispatchEvent(new Event('scroll'));
  }

  /* =========================================================
     2. Menu mobile
     ========================================================= */
  var burger = $('#burger');
  var nav    = $('#nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  /* =========================================================
     3. Révélation des éléments au scroll
     ========================================================= */
  var revealables = $$('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealables.forEach(function (el) { revealObs.observe(el); });
  }

  /* =========================================================
     4. Compteurs animés (chiffres clés)
     ========================================================= */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';

    if (reduceMotion) { el.textContent = target + suffix; return; }

    var duration = 1400;
    var start    = null;

    function frame(ts) {
      if (start === null) start = ts;
      var p    = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * ease) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); countObs.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { countObs.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* =========================================================
     5. Lien de navigation actif selon la section visible
     ========================================================= */
  var sections = ['expertises', 'packs', 'realisations', 'methode', 'devis']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = $('.nav a[href="#' + entry.target.id + '"]');
        if (link && !link.classList.contains('btn')) {
          link.classList.toggle('active', entry.isIntersecting);
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navObs.observe(s); });
  }

  /* =========================================================
     6. Animations mises en pause hors de l'écran
     ---------------------------------------------------------
     Les vignettes de packs et le visuel du hero bouclent en
     continu : inutile de les composer quand elles sont hors champ.
     ========================================================= */
  var looping = $$('.pack-anim, .gem-scene, .hero-halo');

  if ('IntersectionObserver' in window && !reduceMotion) {
    var animObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('anim-paused', !entry.isIntersecting);
      });
    }, { rootMargin: '120px 0px' });

    looping.forEach(function (el) {
      el.classList.add('anim-paused');
      animObs.observe(el);
    });
  }

  /* Onglet en arrière-plan : on suspend tout. */
  document.addEventListener('visibilitychange', function () {
    var hidden = document.visibilityState === 'hidden';
    looping.forEach(function (el) {
      if (hidden) el.classList.add('anim-paused');
    });
  });

  /* =========================================================
     7. Halo des cartes de packs suivant le curseur
     ---------------------------------------------------------
     Deux variables CSS mises à jour au survol : le dégradé est
     peint par le compositeur, aucune propriété de mise en page
     n'est touchée. Pointeur fin uniquement — sans souris, le
     halo n'aurait aucun sens.
     ========================================================= */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    $$('.pack').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100) + '%');
      });
    });
  }

  /* =========================================================
     8. Bandeau clients : piste dupliquée pour un défilement continu
     ---------------------------------------------------------
     La copie est masquée aux lecteurs d'écran : elle ne sert
     qu'à ce que la boucle se referme sans saut visible.
     ========================================================= */
  var clientsTrack = $('#clientsTrack');
  if (clientsTrack && !reduceMotion) {
    var copie = clientsTrack.firstElementChild.cloneNode(true);
    copie.setAttribute('aria-hidden', 'true');
    clientsTrack.appendChild(copie);
  }

  /* =========================================================
     9. Barre d'action mobile
     ---------------------------------------------------------
     Visible une fois le hero dépassé, masquée dès que le
     formulaire de devis est lui-même à l'écran.
     ========================================================= */
  var ctaMobile = $('#ctaMobile');
  var hero      = $('.hero');
  var devis     = $('#devis');

  if (ctaMobile && hero && devis && 'IntersectionObserver' in window) {
    var heroVisible  = true;
    var devisVisible = false;

    var majCta = function () {
      ctaMobile.classList.toggle('visible', !heroVisible && !devisVisible);
    };

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { heroVisible = e.isIntersecting; });
      majCta();
    }, { threshold: 0 }).observe(hero);

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { devisVisible = e.isIntersecting; });
      majCta();
    }, { threshold: 0 }).observe(devis);
  }

  /* =========================================================
     10. Bouton de prise de rendez-vous
     ========================================================= */
  var rdvBloc = $('#rdvBloc');
  if (rdvBloc && CONFIG.RDV_URL) {
    var rdvLien = $('#rdvLien');
    rdvLien.href = CONFIG.RDV_URL;
    rdvLien.target = '_blank';
    rdvLien.rel = 'noopener';
    rdvLien.addEventListener('click', function () { objectif('Prise de rendez-vous'); });
    rdvBloc.hidden = false;
  }

  /* =========================================================
     11. FAQ : une seule question ouverte à la fois
     ========================================================= */
  var faqItems = $$('.faq details');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqItems.forEach(function (other) { if (other !== item) other.open = false; });
    });
  });

  /* =========================================================
     12. Page de confirmation : mention de l'accusé de réception
     ---------------------------------------------------------
     L'accusé n'est envoyé que si la demande a été confirmée par
     Turnstile (voir server/devis.js). On ne l'annonce donc que
     si le serveur a dit qu'il était bien parti.
     ========================================================= */
  var arNote = $('#arNote');
  if (arNote && /(?:^|[?&])ar=1(?:&|$)/.test(window.location.search)) {
    arNote.hidden = false;
  }

  /* =========================================================
     13. Année courante dans le pied de page
     ========================================================= */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* =========================================================
     14. Formulaire de devis
     ---------------------------------------------------------
     Absent des pages annexes (merci, mentions, confidentialité) :
     on s'arrête ici pour elles.
     ========================================================= */
  var form = $('#devisForm');
  if (!form) return;

  var statusEl  = $('#formStatus');
  var submitBtn = $('#submitBtn');
  var packSel   = $('#f-pack');
  var stepLabel = $('#stepLabel');
  var stepBar   = $('#stepBar');
  var steps     = $$('.form-step', form);

  var STEP_TITLES = ['Vos coordonnées', 'Votre projet'];
  var current = 0;

  /* ------------------ navigation par étapes ---------------- */
  function fieldsOfStep(index) {
    return $$('input, select, textarea', steps[index]).filter(function (el) {
      return el.name && el.name !== 'site_web';
    });
  }

  function showStep(index, moveFocus) {
    current = index;

    steps.forEach(function (step, i) { step.hidden = i !== index; });

    if (stepLabel) {
      stepLabel.textContent = 'Étape ' + (index + 1) + ' sur ' + steps.length +
                              ' · ' + STEP_TITLES[index];
    }
    if (stepBar) {
      stepBar.style.width = ((index + 1) / steps.length * 100) + '%';
    }

    if (moveFocus) {
      var first = fieldsOfStep(index)[0];
      if (first) first.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  $$('.js-next', form).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var firstInvalid = null;
      fieldsOfStep(current).forEach(function (input) {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        setStatus('Complétez les champs signalés avant de continuer.', 'ko');
        firstInvalid.focus();
        return;
      }
      setStatus('');
      showStep(Math.min(current + 1, steps.length - 1), true);
    });
  });

  $$('.js-prev', form).forEach(function (btn) {
    btn.addEventListener('click', function () {
      setStatus('');
      showStep(Math.max(current - 1, 0), true);
    });
  });

  showStep(0, false);

  /* -- « Être prévenu du lancement » sur les offres à venir --
        Ces packs ne sont pas encore commandables : on renvoie vers le
        formulaire avec un message pré-rempli, sans inventer une option
        de devis qui n'existe pas encore. -- */
  $$('.js-prevenir').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var offre = btn.getAttribute('data-offre') || '';
      var message = $('#f-message');
      if (message && !message.value.trim()) {
        message.value = 'Je souhaite être prévenu du lancement du ' + offre + '.';
      }
      selectionnerPack('À définir ensemble');
      showStep(0, false);
      document.getElementById('devis').scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'
      });
      window.setTimeout(function () { $('#f-nom').focus({ preventScroll: true }); }, 650);
      objectif('Intérêt offre à venir', { props: { offre: offre } });
    });
  });

  /* -- pré-sélection depuis l'URL : ?pack=convention --
        Les pages dédiées renvoient vers le formulaire avec ce paramètre. -- */
  var SLUGS = {
    'essentiel': 'Pack Essentiel',
    'sur-mesure': 'Pack Sur-mesure'
  };

  function selectionnerPack(nom) {
    if (!packSel || !nom) return false;
    var match = Array.prototype.find.call(packSel.options, function (o) {
      return o.textContent.trim() === nom;
    });
    if (!match) return false;
    packSel.value = match.value;
    packSel.classList.remove('prefilled');
    void packSel.offsetWidth;
    packSel.classList.add('prefilled');
    return true;
  }

  (function depuisURL() {
    var slug = new URLSearchParams(window.location.search).get('pack');
    if (slug && SLUGS[slug]) selectionnerPack(SLUGS[slug]);
  }());

  /* -- pré-sélection du pack depuis les boutons des cartes -- */
  $$('.js-devis').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectionnerPack(btn.getAttribute('data-pack'));
      showStep(0, false);
      document.getElementById('devis').scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      });
      window.setTimeout(function () { $('#f-nom').focus({ preventScroll: true }); }, 650);
    });
  });

  /* ---------------------- validation ---------------------- */
  var MESSAGES = {
    'f-nom':     'Merci d’indiquer votre nom.',
    'f-societe': 'Merci d’indiquer le nom de votre société.',
    'f-email':   'Merci d’indiquer une adresse e-mail valide.',
    'f-pack':    'Merci de sélectionner un type d’événement.',
    'f-message': 'Décrivez votre projet en quelques lignes.',
    'f-rgpd':    'Votre accord est nécessaire pour traiter la demande.'
  };

  function setError(input, message) {
    var field = input.closest('.field');
    var err   = $('.err[data-for="' + input.id + '"]', field);
    field.classList.toggle('invalid', Boolean(message));
    if (err) err.textContent = message || '';
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function validateField(input) {
    var value = (input.value || '').trim();
    var msg   = '';

    if (input.type === 'checkbox') {
      if (input.required && !input.checked) msg = MESSAGES[input.id] || 'Champ requis.';
    } else if (input.required && !value) {
      msg = MESSAGES[input.id] || 'Champ requis.';
    } else if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      msg = MESSAGES['f-email'];
    } else if (input.type === 'tel' && value && !/^[+0-9\s().-]{6,20}$/.test(value)) {
      msg = 'Numéro de téléphone invalide.';
    } else if (input.type === 'number' && value && (Number(value) < 1 || Number(value) > 100000)) {
      msg = 'Indiquez un nombre de participants réaliste.';
    }

    setError(input, msg);
    return !msg;
  }

  var fields = $$('input, select, textarea', form).filter(function (el) {
    return el.name && el.name !== 'site_web' && el.type !== 'file';
  });

  /* ------------------ pièce jointe facultative -------------------
     3 Mo : au-delà, le corps encodé en base64 dépasse la limite de
     charge utile des fonctions serverless. */
  var champFichier = $('#f-fichier');
  var TAILLE_MAX = 3 * 1024 * 1024;
  var EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

  function validerFichier() {
    if (!champFichier) return true;
    var f = champFichier.files && champFichier.files[0];
    if (!f) { setError(champFichier, ''); return true; }

    var ext = (f.name.split('.').pop() || '').toLowerCase();
    if (EXTENSIONS.indexOf(ext) === -1) {
      setError(champFichier, 'Formats acceptés : PDF, Word, PowerPoint, Excel.');
      return false;
    }
    if (f.size > TAILLE_MAX) {
      setError(champFichier, 'Fichier trop lourd (' +
        (f.size / 1048576).toFixed(1) + ' Mo). Maximum 3 Mo.');
      return false;
    }
    setError(champFichier, '');
    return true;
  }

  if (champFichier) champFichier.addEventListener('change', validerFichier);

  function lireFichier() {
    var f = champFichier && champFichier.files && champFichier.files[0];
    if (!f) return Promise.resolve(null);
    return new Promise(function (resoudre) {
      var lecteur = new FileReader();
      lecteur.onload = function () {
        resoudre({
          nom: f.name,
          type: f.type || 'application/octet-stream',
          taille: f.size,
          contenu: String(lecteur.result).split(',')[1] || ''
        });
      };
      lecteur.onerror = function () { resoudre(null); };
      lecteur.readAsDataURL(f);
    });
  }

  var byName = {};
  fields.forEach(function (el) { byName[el.name] = el; });

  fields.forEach(function (input) {
    input.addEventListener('blur', function () { validateField(input); });
    input.addEventListener('input', function () {
      if (input.closest('.field').classList.contains('invalid')) validateField(input);
    });
  });

  /* ------------------- données du message ------------------ */
  function collect() {
    var d = {};
    fields.forEach(function (el) {
      d[el.name] = el.type === 'checkbox' ? (el.checked ? 'Oui' : 'Non') : (el.value || '').trim();
    });
    return d;
  }

  var LABELS = {
    nom: 'Nom', fonction: 'Fonction', societe: 'Société', email: 'E-mail',
    telephone: 'Téléphone', pack: 'Type d’événement', date_evenement: 'Date envisagée',
    participants: 'Nombre de participants', ville: 'Ville / région',
    budget: 'Budget prévisionnel', message: 'Projet', consentement: 'Consentement'
  };

  function toText(d) {
    return Object.keys(LABELS).map(function (k) {
      return LABELS[k] + ' : ' + (d[k] || '—');
    }).join('\n');
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  function loading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
    $('.btn-label', submitBtn).textContent = on ? 'Envoi en cours…' : 'Envoyer ma demande de devis';
  }

  /* ------------------ anti-robot Turnstile ----------------- */
  var turnstileId = null;

  (function loadTurnstile() {
    if (!CONFIG.TURNSTILE_SITE_KEY) return;

    var mount = $('#turnstileMount');
    if (!mount) return;
    mount.hidden = false;

    window.onTurnstileReady = function () {
      turnstileId = window.turnstile.render(mount, {
        sitekey: CONFIG.TURNSTILE_SITE_KEY,
        theme: 'dark',
        language: 'fr'
      });
    };

    var script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js' +
                 '?render=explicit&onload=onTurnstileReady';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }());

  function turnstileToken() {
    if (turnstileId === null || !window.turnstile) return '';
    return window.turnstile.getResponse(turnstileId) || '';
  }

  function resetTurnstile() {
    if (turnstileId !== null && window.turnstile) window.turnstile.reset(turnstileId);
  }

  /* ----------------- repli : client mail ------------------- */
  function sendViaMailto(data) {
    var subject = 'Demande de devis — ' + (data.pack || 'événement') +
                  ' — ' + (data.societe || data.nom);
    var body    = 'Bonjour,\n\nVoici notre demande de devis :\n\n' + toText(data) +
                  '\n\nDemande envoyée depuis le site EDB Événement.';
    window.location.href = 'mailto:' + CONFIG.CONTACT_EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body='    + encodeURIComponent(body);

    setStatus(
      'Votre logiciel de messagerie vient de s’ouvrir avec la demande pré-remplie : ' +
      'il ne reste plus qu’à l’envoyer. Si rien ne s’est ouvert, écrivez-nous à ' +
      CONFIG.CONTACT_EMAIL + '.', 'ok'
    );
  }

  /* --------- erreurs renvoyées par le serveur (422) -------- */
  function applyServerErrors(errors) {
    var firstInvalid = null;
    Object.keys(errors).forEach(function (name) {
      var input = byName[name];
      if (!input) return;
      setError(input, errors[name]);
      if (!firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      var stepIndex = steps.indexOf(firstInvalid.closest('.form-step'));
      if (stepIndex > -1 && stepIndex !== current) showStep(stepIndex, false);
      firstInvalid.focus();
    }
    setStatus('Certains champs doivent être corrigés avant l’envoi.', 'ko');
  }

  /* ---------------------- soumission ----------------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    setStatus('');

    /* pot de miel anti-spam : rempli = robot, on fait comme si tout allait bien */
    if ($('#f-site').value) {
      setStatus('Merci, votre demande a bien été envoyée.', 'ok');
      form.reset();
      return;
    }

    var firstInvalid = null;
    fields.forEach(function (input) {
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });
    if (!validerFichier() && !firstInvalid) firstInvalid = champFichier;

    if (firstInvalid) {
      var stepIndex = steps.indexOf(firstInvalid.closest('.form-step'));
      if (stepIndex > -1 && stepIndex !== current) showStep(stepIndex, false);
      setStatus('Certains champs doivent être corrigés avant l’envoi.', 'ko');
      firstInvalid.focus();
      return;
    }

    var data = collect();

    if (!CONFIG.API_ENDPOINT) { sendViaMailto(data); return; }

    if (CONFIG.TURNSTILE_SITE_KEY && !turnstileToken()) {
      setStatus('Merci de valider la vérification anti-robot ci-dessus.', 'ko');
      return;
    }

    loading(true);

    lireFichier().then(function (fichier) {
      var payload = {};
      Object.keys(data).forEach(function (k) { payload[k] = data[k]; });
      payload.turnstile_token = turnstileToken();
      payload.recapitulatif   = toText(data);
      if (fichier) payload.fichier = fichier;

      return fetch(CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
    })
      .then(function (res) {
        return res.json()
          .catch(function () { return {}; })
          .then(function (json) { return { status: res.status, ok: res.ok, json: json }; });
      })
      .then(function (res) {
        /* Champs refusés par le serveur : on les signale sans renvoyer. */
        if (res.status === 422 && res.json.errors) {
          applyServerErrors(res.json.errors);
          resetTurnstile();
          return;
        }

        /* Anti-robot ou débit : message explicite, pas de repli mail. */
        if (res.status === 403 || res.status === 429) {
          setStatus(res.json.error || 'Envoi refusé. Réessayez dans quelques minutes.', 'ko');
          resetTurnstile();
          return;
        }

        /* Toute autre erreur : on ne perd pas la demande, on bascule sur le mail. */
        if (!res.ok || !res.json.ok) throw new Error('HTTP ' + res.status);

        objectif('Devis envoyé', { props: { pack: data.pack } });

        if (CONFIG.SUCCESS_PAGE) {
          window.location.href = CONFIG.SUCCESS_PAGE +
            (res.json.accuse === false ? '' : '?ar=1');
          return;
        }

        form.reset();
        $$('.field', form).forEach(function (f) { f.classList.remove('invalid'); });
        resetTurnstile();
        showStep(0, false);
        setStatus(
          'Merci, votre demande est bien enregistrée.' +
          (res.json.accuse === false ? '' : ' Un accusé de réception vient de vous être envoyé.') +
          ' Un chef de projet revient vers vous sous 48 h ouvrées.', 'ok'
        );
      })
      .catch(function () {
        setStatus(
          'L’envoi automatique a échoué. Nous ouvrons votre messagerie pour transmettre la demande…', 'ko'
        );
        window.setTimeout(function () { sendViaMailto(data); }, 1200);
      })
      .then(function () { loading(false); });
  });

}());
