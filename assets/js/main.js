/* =========================================================
   RUBIS Événements — scripts
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     CONFIGURATION DE L'ENVOI DU DEVIS PAR MAIL
     ---------------------------------------------------------
     Un site statique ne peut pas envoyer d'e-mail tout seul :
     il faut un service qui relaie le formulaire vers la boîte mail.

     1) Créez un formulaire sur Formspree (https://formspree.io)
        ou Web3Forms (https://web3forms.com) avec l'adresse de réception.
     2) Collez l'URL d'envoi obtenue dans FORM_ENDPOINT ci-dessous.

     Tant que FORM_ENDPOINT est vide, le formulaire bascule
     automatiquement sur le client mail du visiteur (mailto:)
     avec un message pré-rempli adressé à CONTACT_EMAIL.
     --------------------------------------------------------- */
  var CONFIG = {
    FORM_ENDPOINT: '',                              // ex. 'https://formspree.io/f/xxxxxxxx'
    CONTACT_EMAIL: 'contact@rubis-evenements.fr'    // boîte de réception des devis
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* =========================================================
     1. Header : fond au scroll + barre de progression
     ========================================================= */
  var header   = $('.site-header');
  var progress = $('#progress');

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle('scrolled', y > 24);

    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? Math.min(y / h, 1) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =========================================================
     2. Menu mobile
     ========================================================= */
  var burger = $('#burger');
  var nav    = $('#nav');

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
  var sections = ['expertises', 'packs', 'methode', 'references', 'devis']
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
     6. FAQ : une seule question ouverte à la fois
     ========================================================= */
  var faqItems = $$('.faq details');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqItems.forEach(function (other) { if (other !== item) other.open = false; });
    });
  });

  /* =========================================================
     7. Formulaire de devis
     ========================================================= */
  var form      = $('#devisForm');
  var statusEl  = $('#formStatus');
  var submitBtn = $('#submitBtn');
  var packSel   = $('#f-pack');

  /* -- pré-sélection du pack depuis les boutons des cartes -- */
  $$('.js-devis').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pack = btn.getAttribute('data-pack');
      if (packSel) {
        var match = Array.prototype.find.call(packSel.options, function (o) {
          return o.textContent.trim() === pack;
        });
        packSel.value = match ? match.value : '';
        packSel.classList.remove('prefilled');
        void packSel.offsetWidth;          /* relance l’animation de mise en avant */
        packSel.classList.add('prefilled');
      }
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
    return el.name && el.name !== 'site_web';
  });

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

  /* ----------------- repli : client mail ------------------- */
  function sendViaMailto(data) {
    var subject = 'Demande de devis — ' + (data.pack || 'événement') +
                  ' — ' + (data.societe || data.nom);
    var body    = 'Bonjour,\n\nVoici notre demande de devis :\n\n' + toText(data) +
                  '\n\nDemande envoyée depuis le site Rubis Événements.';
    window.location.href = 'mailto:' + CONFIG.CONTACT_EMAIL +
      '?subject=' + encodeURIComponent(subject) +
      '&body='    + encodeURIComponent(body);

    setStatus(
      'Votre logiciel de messagerie vient de s’ouvrir avec la demande pré-remplie : ' +
      'il ne reste plus qu’à l’envoyer. Si rien ne s’est ouvert, écrivez-nous à ' +
      CONFIG.CONTACT_EMAIL + '.', 'ok'
    );
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

    if (firstInvalid) {
      setStatus('Certains champs doivent être corrigés avant l’envoi.', 'ko');
      firstInvalid.focus();
      return;
    }

    var data = collect();

    if (!CONFIG.FORM_ENDPOINT) { sendViaMailto(data); return; }

    loading(true);

    var payload = {
      _subject: 'Demande de devis — ' + data.pack + ' — ' + (data.societe || data.nom),
      recapitulatif: toText(data)
    };
    Object.keys(data).forEach(function (k) { payload[k] = data[k]; });

    fetch(CONFIG.FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        $$('.field', form).forEach(function (f) { f.classList.remove('invalid'); });
        setStatus(
          'Merci, votre demande est bien enregistrée. Un chef de projet revient vers vous ' +
          'sous 48 h ouvrées avec une proposition chiffrée.', 'ok'
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

  /* =========================================================
     8. Année courante dans le pied de page
     ========================================================= */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

}());
