# -*- coding: utf-8 -*-
"""Génère une page dédiée par pack dans packs/, plus sitemap.xml et robots.txt.

Une page unique ne se positionne pas sur « organisation séminaire entreprise
Lyon ». Chaque pack a donc sa page, avec son propre contenu, sa FAQ et son
balisage Service + BreadcrumbList.

    python3 tools/generer-pages-packs.py
"""
import os, json, datetime

SITE = "https://www.edb-evenement.fr"
NOM = "EDB Événement"
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── Scènes animées, reprises de la page d'accueil ────────────────────────
SCENES = {
 "essentiel": ('anim-seminaire', '<span class="stage"></span><span class="seats"></span>'
     '<span class="sweep"></span>'),
 "sur-mesure": ('anim-mesure', '<span class="facet-gem"><svg viewBox="0 0 100 100">'
     '<polygon class="f f1" points="34,28 66,28 78,40 22,40"/>'
     '<polygon class="f f2" points="22,40 50,40 50,86"/>'
     '<polygon class="f f3" points="50,40 78,40 50,86"/>'
     '<path class="outline" d="M34 28 H66 L78 40 L50 86 L22 40 Z"/></svg></span>'
     '<span class="orbit"></span>'),
 "attente": ('anim-team', '<svg class="network" viewBox="0 0 260 130">'
     '<g class="net-links">'
     '<line x1="52" y1="88" x2="104" y2="44"/><line x1="104" y1="44" x2="156" y2="82"/>'
     '<line x1="156" y1="82" x2="208" y2="40"/><line x1="52" y1="88" x2="156" y2="82"/>'
     '<line x1="104" y1="44" x2="208" y2="40"/><line x1="104" y1="44" x2="130" y2="106"/>'
     '<line x1="130" y1="106" x2="156" y2="82"/></g><g class="net-nodes">'
     '<circle cx="52" cy="88" r="5"/><circle cx="104" cy="44" r="5"/>'
     '<circle cx="156" cy="82" r="5"/><circle cx="208" cy="40" r="5"/>'
     '<circle cx="130" cy="106" r="5"/></g></svg>'),
 "avenir": ('anim-lancement', '<span class="pulse"></span><span class="pulse"></span>'
     '<span class="pulse"></span><span class="column"></span><span class="object"></span>'),
}

# ── Contenu des packs ───────────────────────────────────────────────────
#
#   L'offre compte QUATRE packs.
#     · statut "disponible"  → carte + page dédiée + option dans le devis
#     · statut "preparation" → carte seule, marquée « En préparation »
#
#   À COMPLÉTER : les tarifs de départ sont volontairement laissés sur
#   « Sur devis » plutôt qu'inventés, et les deux packs en préparation
#   attendent leur nom définitif.
#
PACKS = [
{
 "slug": "essentiel", "statut": "disponible",
 "nom": "Pack Essentiel", "form": "Pack Essentiel",
 "tag": "Format court", "prix": "Sur devis", "unite": "",
 "titre": "Organisation d'événement d'entreprise, formule essentielle",
 "meta": "Formule essentielle pour vos événements d'entreprise : lieu, salle équipée, restauration et coordination le jour J. Devis détaillé sous 48 h.",
 "chapo": "Une formule resserrée sur ce qui compte : un lieu adapté, une salle équipée, la restauration et quelqu'un qui tient la journée. Sans les postes dont vous n'avez pas besoin.",
 "pour_qui": ["Équipes de 20 à 120 personnes", "Réunions annuelles et journées de travail",
              "Premières éditions, avant de voir plus grand", "Budgets cadrés à l'avance"],
 "inclus": [
   ("Recherche et négociation du lieu", "Trois lieux présélectionnés selon vos critères, visite organisée, contrat négocié à notre tarif partenaire."),
   ("Salle équipée et régie légère", "Vidéoprojection, sonorisation, micros et un technicien présent sur toute la durée."),
   ("Restauration et pauses", "Petit-déjeuner, pauses et déjeuner, choisis avec vous et commandés en votre nom."),
   ("Coordination du jour J", "Un chef de projet sur place, du montage à la remise en état, avec un conducteur écrit."),
   ("Accueil et émargement", "Liste des participants, badges si besoin, comptage des présents."),
 ],
 "exclus": ["La scénographie et les décors sur mesure — ils relèvent du Pack Sur-mesure",
            "Les prestations artistiques et la programmation musicale",
            "Les dispositifs multi-jours ou multi-sites"],
 "deroule": [("J-30", "Brief, format retenu et présélection des lieux"),
             ("J-20", "Visite, contractualisation et budget arrêté"),
             ("J-5", "Conducteur écrit, commandes passées, effectifs confirmés"),
             ("Jour J", "Régie sur place, accueil, coordination des prestataires")],
 "faq": [("En quoi l'Essentiel diffère-t-il du Sur-mesure ?",
          "L'Essentiel repose sur un périmètre déjà cadré : un lieu, une salle, la restauration, la coordination. Le Sur-mesure part d'une page blanche et n'a pas de limite de périmètre. Si votre besoin entre dans les cases, l'Essentiel coûte moins cher et se monte plus vite."),
         ("Quel délai faut-il prévoir ?",
          "Quatre à six semaines suffisent dans la plupart des cas. La contrainte vient presque toujours de la disponibilité des lieux, rarement de la production."),
         ("Pourquoi le tarif est-il « sur devis » ?",
          "Parce que le lieu et la restauration pèsent l'essentiel du budget et varient du simple au triple selon la ville, la date et l'effectif. Nous chiffrons poste par poste sous 48 h ouvrées, sans engagement.")],
 "cas": ("seminaire", "Trois jours de cadrage stratégique", "Séminaire résidentiel du comité exécutif : lieu privatisé, ateliers facilités et restitution filmée le dernier jour."),
},
{
 "slug": "sur-mesure", "statut": "disponible",
 "nom": "Pack Sur-mesure", "form": "Pack Sur-mesure",
 "tag": "Sans limite de périmètre", "prix": "Sur devis", "unite": "",
 "titre": "Événements sur-mesure et dispositifs annuels",
 "meta": "Événements construits intégralement sur mesure : conventions, lancements, galas, dispositifs multi-sites et programmes annuels. Devis détaillé sous 48 h.",
 "chapo": "Un dispositif construit autour de votre besoin, sans grille imposée. Conventions, lancements, galas, tournées, programmes annuels : quand le projet ne rentre dans aucune case, on construit la case.",
 "pour_qui": ["Conventions et plénières de plus de 150 personnes", "Lancements produit et roadshows multi-villes",
              "Soirées de gala et remises de prix", "Groupes confiant leur programme événementiel annuel"],
 "inclus": [
   ("Atelier de cadrage et concept dédié", "Objectifs, message, format et parcours participant, arrêtés avec vous avant tout chiffrage."),
   ("Scénographie et production technique", "Scène, décor, son, lumière, vidéo, captation : conception, fabrication et régie générale."),
   ("Coordination de tous les prestataires", "Lieux, traiteurs, artistes, sécurité, transport, hébergement, sous un seul contrat."),
   ("Événements multi-jours, multi-sites, multi-pays", "Coordination centralisée, partenaires locaux, conformité réglementaire par pays."),
   ("Reporting budgétaire et bilan", "Suivi consolidé des dépenses, rapport de satisfaction et bilan carbone."),
 ],
 "exclus": ["L'achat d'espace publicitaire et le média payant",
            "Les frais de déplacement et d'hébergement des participants"],
 "deroule": [("J-120", "Atelier de cadrage, concept et budget prévisionnel"),
             ("J-60", "Scénographie validée, prestataires contractualisés"),
             ("J-15", "Répétitions, conducteur figé, plan de prévention déposé"),
             ("Jour J", "Montage, régie générale, démontage, puis bilan sous 7 jours")],
 "faq": [("Travaillez-vous en marchés publics ?",
          "Oui. Nous fournissons l'ensemble des pièces administratives — attestations URSSAF, RC Pro, références — et répondons aux consultations publiques comme privées."),
         ("Peut-on ne vous confier qu'une partie de l'événement ?",
          "Oui. Nous intervenons aussi en régie seule, en production technique ou en conseil, en complément d'une équipe interne déjà en place."),
         ("Comment est facturé un accompagnement annuel ?",
          "Soit au forfait, avec une enveloppe et un périmètre définis à l'année, soit à la mission. Le mode est arrêté au cadrage, jamais en cours de route.")],
 "cas": ("convention", "Réunir 850 collaborateurs sur deux jours", "Convention plénière et ateliers pour un groupe industriel, montée en six semaines après un changement de lieu de dernière minute."),
},
{
 "slug": "premium", "statut": "preparation",
 "nom": "Pack Premium", "form": None,
 "tag": "Nouvelle formule", "prix": "", "unite": "",
 "titre": "", "meta": "", "chapo": "",
 "desc": "Son périmètre et son tarif seront annoncés prochainement. Laissez-nous vos coordonnées pour être prévenu de son ouverture.",
 "scene": "attente",
},
{
 "slug": "prestige", "statut": "preparation",
 "nom": "Pack Prestige", "form": None,
 "tag": "Nouvelle formule", "prix": "", "unite": "",
 "titre": "", "meta": "", "chapo": "",
 "desc": "Son périmètre et son tarif seront annoncés prochainement. Laissez-nous vos coordonnées pour être prévenu de son ouverture.",
 "scene": "avenir",
},
]

DISPONIBLES = [p for p in PACKS if p["statut"] == "disponible"]

LOGO = ('<svg viewBox="0 0 100 100" class="gem-svg">'
 '<defs><linearGradient id="gTop" x1="0" y1="0" x2="1" y2="1">'
 '<stop offset="0%" stop-color="#e2233d"/><stop offset="100%" stop-color="#8a0b1f"/></linearGradient>'
 '<linearGradient id="gBody" x1="0.5" y1="0" x2="0.5" y2="1">'
 '<stop offset="0%" stop-color="#c8102e"/><stop offset="100%" stop-color="#6d0817"/></linearGradient></defs>'
 '<polygon points="34,28 66,28 78,40 22,40" fill="url(#gTop)"/>'
 '<polygon points="22,40 78,40 50,86" fill="url(#gBody)"/>'
 '<polygon points="22,40 50,40 50,86" fill="#fff" opacity=".07"/>'
 '<path d="M34 28 H66 L78 40 L50 86 L22 40 Z" fill="none" stroke="#e8909c" '
 'stroke-opacity=".4" stroke-width="1.1" stroke-linejoin="round"/></svg>')


def page(p, autres):
    cls, inner = SCENES[p["slug"]]
    url = f"{SITE}/packs/{p['slug']}.html"
    # Le balisage est construit en Python puis sérialisé : bien plus sûr que
    # d'assembler du JSON à la main quand le texte contient des apostrophes.
    service = {
        "@type": "Service",
        "name": p["nom"],
        "serviceType": p["titre"],
        "description": p["meta"],
        "provider": {"@type": "Organization", "name": NOM, "url": SITE + "/"},
        "areaServed": {"@type": "Country", "name": "France"},
        "url": url,
    }
    if p["prix"] != "Sur devis":
        service["offers"] = {
            "@type": "Offer",
            "priceCurrency": "EUR",
            "price": p["prix"].replace("\u202f", "").replace(" ", "").replace("€", ""),
            "priceSpecification": {"@type": "PriceSpecification",
                                   "valueAddedTaxIncluded": False},
            "availability": "https://schema.org/InStock",
            "url": url,
        }

    graphe = {
        "@context": "https://schema.org",
        "@graph": [
            service,
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Accueil", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Packs", "item": SITE + "/#packs"},
                {"@type": "ListItem", "position": 3, "name": p["nom"], "item": url},
            ]},
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": q,
                 "acceptedAnswer": {"@type": "Answer", "text": r}}
                for q, r in p["faq"]
            ]},
        ],
    }
    jsonld = json.dumps(graphe, ensure_ascii=False, indent=2)

    inclus = "\n".join(f'''        <div class="detail">
          <h3>{t}</h3>
          <p>{d}</p>
        </div>''' for t, d in p["inclus"])

    pour_qui = "\n".join(f"          <li>{x}</li>" for x in p["pour_qui"])

    exclus = ""
    if p["exclus"]:
        lignes = "\n".join(f"          <li>{x}</li>" for x in p["exclus"])
        exclus = f'''
      <div class="hors-perimetre">
        <h3>Ce que ce pack ne comprend pas</h3>
        <ul>
{lignes}
        </ul>
      </div>'''

    deroule = "\n".join(f'''        <li class="step reveal" data-delay="{i+1}">
          <span class="step-num">{j}</span>
          <h3>{t}</h3>
        </li>''' for i, (j, t) in enumerate(p["deroule"]))

    faq_html = "\n".join(f'''        <details>
          <summary>{q}</summary>
          <p>{r}</p>
        </details>''' for q, r in p["faq"])

    liens_autres = "\n".join(
        f'          <a href="{a["slug"]}.html">{a["nom"]}</a>'
        for a in DISPONIBLES if a["slug"] != p["slug"])

    cas_img, cas_titre, cas_texte = p["cas"]

    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{p["titre"]} — {NOM}</title>
<meta name="description" content="{p["meta"]}">
<meta name="theme-color" content="#0b0c0e">
<link rel="icon" href="../assets/img/logo.svg" type="image/svg+xml">
<meta property="og:title" content="{p["titre"]} — {NOM}">
<meta property="og:description" content="{p["meta"]}">
<meta property="og:type" content="website">
<link rel="preload" href="../assets/fonts/inter-latin-variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/css/styles.css">
<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>

<a class="skip-link" href="#contenu">Aller au contenu</a>
<div class="grain" aria-hidden="true"></div>

<!-- ============ BANDEAU D'ANNONCE ============ -->
<div class="annonce-haut" id="annonceHaut" role="region" aria-label="Ouverture de l'entreprise">
  <div class="wrap annonce-inner">
    <span class="annonce-pastille" aria-hidden="true"></span>
    <p class="annonce-texte"><strong>Ouverture de l'entreprise</strong></p>
    <p class="compte-rebours" id="compteRebours" aria-hidden="true">
      <span class="cr-bloc"><b data-unite="jours">&mdash;</b><i>j</i></span>
      <span class="cr-bloc"><b data-unite="heures">&mdash;</b><i>h</i></span>
      <span class="cr-bloc"><b data-unite="minutes">&mdash;</b><i>min</i></span>
      <span class="cr-bloc cr-secondes"><b data-unite="secondes">&mdash;</b><i>s</i></span>
    </p>
    <span class="sr-only" id="compteTexte"></span>
  </div>
</div>

<header class="site-header scrolled" id="top">
  <div class="wrap header-inner">
    <a class="brand" href="../index.html" aria-label="{NOM} — accueil">
      <span class="brand-gem" aria-hidden="true">{LOGO}</span>
      <span class="brand-text"><strong>EDB</strong><em>Événement</em></span>
    </a>
    <nav class="nav" id="nav" aria-label="Navigation principale">
      <a href="../index.html#expertises">Expertises</a>
      <a href="../index.html#packs">Packs</a>
      <a href="../index.html#realisations">Réalisations</a>
      <a href="../index.html#methode">Méthode</a>
      <a class="btn btn-primary nav-cta" href="../index.html?pack={p['slug']}#devis">Demander un devis</a>
    </nav>
    <button class="burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="nav">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="header-progress" id="progress"></div>
</header>

<main id="contenu">

  <nav class="fil" aria-label="Fil d'Ariane">
    <div class="wrap">
      <a href="../index.html">Accueil</a>
      <span aria-hidden="true">›</span>
      <a href="../index.html#packs">Packs</a>
      <span aria-hidden="true">›</span>
      <span aria-current="page">{p["nom"]}</span>
    </div>
  </nav>

  <section class="pack-hero">
    <div class="wrap pack-hero-inner">
      <div>
        <p class="eyebrow">{p["tag"]}</p>
        <h1>{p["titre"]}</h1>
        <p class="lead">{p["chapo"]}</p>
        <div class="pack-hero-cta">
          <a class="btn btn-primary" href="../index.html?pack={p['slug']}#devis">Demander un devis</a>
          <a class="btn btn-ghost" href="#comprend">Ce que comprend le pack</a>
        </div>
        <p class="price price-hero">
          <small>à partir de</small><strong>{p["prix"]}</strong><small>{p["unite"]}</small>
        </p>
      </div>
      <div class="pack-hero-visual">
        <div class="pack-anim {cls}" aria-hidden="true">{inner}</div>
      </div>
    </div>
  </section>

  <section class="section" id="comprend">
    <div class="wrap">
      <header class="sec-head">
        <p class="eyebrow reveal">Périmètre</p>
        <h2 class="reveal" data-delay="1">Ce que comprend le {p["nom"].lower()}</h2>
      </header>
      <div class="details">
{inclus}
      </div>{exclus}
    </div>
  </section>

  <section class="section section-engagements">
    <div class="wrap">
      <div class="pack-deux">
        <div>
          <p class="eyebrow reveal">Pour qui</p>
          <h2 class="reveal" data-delay="1">À qui s'adresse ce pack</h2>
          <ul class="devis-points reveal" data-delay="2">
{pour_qui}
          </ul>
        </div>
        <figure class="pack-cas reveal" data-delay="2">
          <img src="../assets/img/realisations/{cas_img}.svg" alt="Illustration : {cas_titre.lower()}"
               width="800" height="500" loading="lazy" decoding="async">
          <figcaption>
            <strong>{cas_titre}</strong>
            <span>{cas_texte}</span>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <header class="sec-head">
        <p class="eyebrow reveal">Déroulé type</p>
        <h2 class="reveal" data-delay="1">Comment se passe la mission</h2>
      </header>
      <ol class="steps">
{deroule}
      </ol>
    </div>
  </section>

  <section class="section section-faq">
    <div class="wrap faq-inner">
      <header class="sec-head">
        <p class="eyebrow reveal">Questions fréquentes</p>
        <h2 class="reveal" data-delay="1">À propos de ce pack</h2>
      </header>
      <div class="faq reveal">
{faq_html}
      </div>
    </div>
  </section>

  <section class="section section-cta-pack">
    <div class="wrap">
      <div class="cta-pack">
        <div>
          <h2>Un projet de ce type ?</h2>
          <p>Décrivez-le en quelques lignes : réponse chiffrée sous 48 h ouvrées, détaillée poste par poste et sans engagement.</p>
        </div>
        <a class="btn btn-primary" href="../index.html?pack={p['slug']}#devis">Demander un devis</a>
      </div>

      <nav class="autres-packs" aria-label="Autres packs">
        <p class="footer-title">Les autres packs</p>
        <div>
{liens_autres}
        </div>
      </nav>
    </div>
  </section>

</main>

<footer class="site-footer">
  <div class="wrap footer-bottom">
    <p>© <span id="year">2026</span> {NOM} — Tous droits réservés.</p>
    <p>
      <a href="../mentions-legales.html">Mentions légales</a> ·
      <a href="../confidentialite.html">Politique de confidentialité</a>
    </p>
  </div>
</footer>

<script src="../assets/js/main.js" defer></script>
</body>
</html>
'''


def carte(p):
    """Carte d'un pack pour la page d'accueil."""
    if p["statut"] == "disponible":
        cls, inner = SCENES[p["slug"]]
        listes = "\n".join(f"            <li>{t}</li>" for t, _ in p["inclus"])
        return f"""      <article class="pack pack-dispo reveal" data-delay="{{delai}}">
        <p class="pack-badge pack-badge-dispo">Disponible</p>
        <div class="pack-anim {cls}" aria-hidden="true">{inner}</div>
        <div class="pack-body">
          <p class="pack-tag">{p["tag"]}</p>
          <h3>{p["nom"]}</h3>
          <p class="pack-desc">{p["chapo"].split(".")[0]}.</p>
          <ul class="pack-list">
{listes}
          </ul>
          <a class="pack-detail" href="packs/{p["slug"]}.html">Voir le détail du pack</a>
          <div class="pack-foot">
            <p class="price"><small>tarif</small><strong>Sur devis</strong><small>&nbsp;</small></p>
            <button class="btn btn-primary btn-sm js-devis" data-pack="{p["nom"]}">Demander ce pack</button>
          </div>
        </div>
      </article>"""

    cls, inner = SCENES[p["scene"]]
    return f"""      <article class="pack pack-attente reveal" data-delay="{{delai}}">
        <p class="pack-badge pack-badge-attente">
          <span class="pastille" aria-hidden="true"></span>En préparation
        </p>
        <div class="pack-anim {cls}" aria-hidden="true">{inner}</div>
        <div class="pack-body">
          <p class="pack-tag">{p["tag"]}</p>
          <h3>{p["nom"]}</h3>
          <p class="pack-desc">{p["desc"]}</p>
          <div class="pack-foot">
            <p class="price"><small>ouverture</small><strong>Prochainement</strong><small>&nbsp;</small></p>
            <button class="btn btn-outline btn-sm js-prevenir" data-offre="{p["nom"]}">
              Être prévenu
            </button>
          </div>
        </div>
      </article>"""


def section_packs():
    """Bloc inséré dans index.html entre les marqueurs PACKS."""
    cartes = "\n\n".join(
        carte(p).replace("{delai}", str(i % 4 + 1)) for i, p in enumerate(PACKS))
    return f"""<!-- PACKS:DEBUT — généré par tools/generer-pages-packs.py, ne pas éditer à la main -->
<section class="section section-packs" id="packs">
  <span class="blob blob-1" aria-hidden="true"></span>
  <span class="blob blob-2" aria-hidden="true"></span>
  <div class="wrap">
    <header class="sec-head">
      <p class="eyebrow reveal">Nos packs</p>
      <h2 class="reveal" data-delay="1">Deux formules ouvertes, deux à venir</h2>
      <p class="sec-sub reveal" data-delay="2">
        Chaque formule fixe un périmètre et un point de départ. Le contenu s'ajuste
        ensuite à votre lieu, votre date et vos effectifs — sans frais de dossier
        ni surprise en fin de mission.
      </p>
    </header>

    <div class="packs packs-quatre">
{cartes}
    </div>
  </div>
</section>
<!-- PACKS:FIN -->"""


def main():
    dossier = os.path.join(RACINE, "packs")
    os.makedirs(dossier, exist_ok=True)

    # Les pages des packs retirés de l'offre ne doivent pas survivre.
    attendus = {p["slug"] + ".html" for p in DISPONIBLES}
    for fichier in sorted(os.listdir(dossier)):
        if fichier.endswith(".html") and fichier not in attendus:
            os.remove(os.path.join(dossier, fichier))
            print(f"supprimé : packs/{fichier}")

    for p in DISPONIBLES:
        chemin = os.path.join(dossier, p["slug"] + ".html")
        with open(chemin, "w", encoding="utf-8") as f:
            f.write(page(p, PACKS))
        print(f"packs/{p['slug']}.html".ljust(34), f"{os.path.getsize(chemin)/1024:.1f} Ko")

    # ── section packs de la page d'accueil ──────────────────────────────
    accueil = os.path.join(RACINE, "index.html")
    with open(accueil, encoding="utf-8") as f:
        html = f.read()
    debut, fin = "<!-- PACKS:DEBUT", "<!-- PACKS:FIN -->"
    if debut in html and fin in html:
        avant = html[:html.index(debut)]
        apres = html[html.index(fin) + len(fin):]
        with open(accueil, "w", encoding="utf-8") as f:
            f.write(avant + section_packs() + apres)
        print("index.html".ljust(34), "section packs régénérée")
    else:
        print("index.html".ljust(34), "MARQUEURS PACKS ABSENTS — section non régénérée")

    # ── sitemap ─────────────────────────────────────────────────────────
    aujourd_hui = datetime.date.today().isoformat()
    urls = [(SITE + "/", "1.0", "weekly")]
    urls += [(f"{SITE}/packs/{p['slug']}.html", "0.8", "monthly") for p in DISPONIBLES]
    urls += [(f"{SITE}/billetterie.html", "0.9", "daily"),
             (f"{SITE}/cgv.html", "0.2", "yearly"),
             (f"{SITE}/mentions-legales.html", "0.2", "yearly"),
             (f"{SITE}/confidentialite.html", "0.2", "yearly")]
    corps = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{aujourd_hui}</lastmod>\n"
        f"    <changefreq>{f}</changefreq>\n    <priority>{pr}</priority>\n  </url>"
        for u, pr, f in urls)
    with open(os.path.join(RACINE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n'
                f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{corps}\n</urlset>\n')
    print("sitemap.xml".ljust(34), f"{len(urls)} URL")

    # ── robots ──────────────────────────────────────────────────────────
    with open(os.path.join(RACINE, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(f"""User-agent: *
Allow: /
Disallow: /merci.html
Disallow: /billetterie-confirmation.html
Disallow: /verifier-billet.html
Disallow: /api/

Sitemap: {SITE}/sitemap.xml
""")
    print("robots.txt".ljust(34), "écrit")


if __name__ == "__main__":
    main()
