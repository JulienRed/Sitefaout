# -*- coding: utf-8 -*-
"""Génère une page dédiée par pack dans packs/, plus sitemap.xml et robots.txt.

Une page unique ne se positionne pas sur « organisation séminaire entreprise
Lyon ». Chaque pack a donc sa page, avec son propre contenu, sa FAQ et son
balisage Service + BreadcrumbList.

    python3 tools/generer-pages-packs.py
"""
import os, json, datetime

SITE = "https://www.rubis-evenements.fr"
NOM = "Rubis Événements"
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── Scènes animées, reprises de la page d'accueil ────────────────────────
SCENES = {
 "seminaire": ('anim-seminaire', '<span class="stage"></span><span class="seats"></span><span class="sweep"></span>'),
 "convention": ('anim-convention', '<span class="audience"></span>'
     '<svg class="arc" viewBox="0 0 260 120" preserveAspectRatio="none">'
     '<path class="arc-line" d="M20 96 Q130 26 240 96"/></svg><span class="podium"></span>'),
 "lancement-produit": ('anim-lancement', '<span class="pulse"></span><span class="pulse"></span>'
     '<span class="pulse"></span><span class="column"></span><span class="object"></span>'),
 "soiree-de-gala": ('anim-gala', '<span class="hall"></span><span class="table"></span>'
     '<span class="light-sweep"></span>'),
 "team-building": ('anim-team', '<svg class="network" viewBox="0 0 260 130">'
     '<g class="net-links">'
     '<line x1="52" y1="88" x2="104" y2="44"/><line x1="104" y1="44" x2="156" y2="82"/>'
     '<line x1="156" y1="82" x2="208" y2="40"/><line x1="52" y1="88" x2="156" y2="82"/>'
     '<line x1="104" y1="44" x2="208" y2="40"/><line x1="104" y1="44" x2="130" y2="106"/>'
     '<line x1="130" y1="106" x2="156" y2="82"/></g><g class="net-nodes">'
     '<circle cx="52" cy="88" r="5"/><circle cx="104" cy="44" r="5"/>'
     '<circle cx="156" cy="82" r="5"/><circle cx="208" cy="40" r="5"/>'
     '<circle cx="130" cy="106" r="5"/></g></svg>'),
 "sur-mesure": ('anim-mesure', '<span class="facet-gem"><svg viewBox="0 0 100 100">'
     '<polygon class="f f1" points="34,28 66,28 78,40 22,40"/>'
     '<polygon class="f f2" points="22,40 50,40 50,86"/>'
     '<polygon class="f f3" points="50,40 78,40 50,86"/>'
     '<path class="outline" d="M34 28 H66 L78 40 L50 86 L22 40 Z"/></svg></span>'
     '<span class="orbit"></span>'),
}

# ── Contenu des packs ───────────────────────────────────────────────────
PACKS = [
{
 "slug": "seminaire", "nom": "Pack Séminaire", "form": "Pack Séminaire",
 "tag": "30 à 150 collaborateurs", "prix": "6 900 €", "unite": "HT",
 "titre": "Organisation de séminaire d'entreprise",
 "meta": "Organisation de séminaires d'entreprise et journées d'étude, de 30 à 150 collaborateurs. Lieu, technique, restauration, animation et coordination. Devis sous 48 h.",
 "chapo": "Journées d'étude, séminaires de direction et séminaires d'équipe, en résidentiel ou à la journée. Un lieu négocié, une salle équipée, des ateliers animés et une logistique qui ne repose pas sur vos équipes.",
 "pour_qui": ["Directions générales et comités exécutifs", "Services RH organisant un séminaire d'intégration",
              "Équipes commerciales en lancement de saison", "Directions métiers en séminaire de cadrage"],
 "inclus": [
   ("Recherche et négociation du lieu", "Trois lieux présélectionnés selon vos critères, visite organisée, contrat négocié à notre tarif partenaire."),
   ("Salle plénière et sous-commissions", "Vidéoprojection, sonorisation, micros, paperboards et régie technique sur toute la durée."),
   ("Restauration, pauses et hébergement", "Petit-déjeuner, pauses, déjeuner et dîner selon le format, chambres bloquées pour le résidentiel."),
   ("Animation des ateliers et facilitation", "Un facilitateur professionnel, des formats d'atelier adaptés à l'objectif, une restitution écrite."),
   ("Transport groupé aller-retour", "Autocar ou navettes depuis un point de rendez-vous unique, ou coordination des trajets individuels."),
 ],
 "exclus": ["Les prestations artistiques lourdes — elles relèvent du Pack Soirée de gala",
            "Les frais de déplacement internationaux des participants"],
 "deroule": [("J-45", "Brief, définition du format et présélection des lieux"),
             ("J-30", "Visite, contractualisation et lancement des inscriptions"),
             ("J-7", "Conducteur minuté, brief des intervenants, repérage technique"),
             ("Jour J", "Régie sur place, accueil des participants, coordination des prestataires")],
 "faq": [("Combien de temps faut-il pour organiser un séminaire ?",
          "Six semaines suffisent pour un format d'une journée. Comptez huit à dix semaines en résidentiel, la contrainte étant la disponibilité des lieux plus que la production."),
         ("Peut-on organiser un séminaire hors de la région parisienne ?",
          "Oui. Nous produisons dans toute la France et en Europe, avec un réseau de lieux et de prestataires référencés dans les principales métropoles."),
         ("Le tarif de départ comprend-il la restauration ?",
          "Le tarif de 6 900 € HT couvre la production et la coordination. La restauration et l'hébergement sont chiffrés séparément, au réel, selon le lieu et l'effectif.")],
 "cas": ("seminaire", "Trois jours de cadrage stratégique", "Séminaire résidentiel du comité exécutif : lieu privatisé, ateliers facilités et restitution filmée le dernier jour."),
},
{
 "slug": "convention", "nom": "Pack Convention", "form": "Pack Convention",
 "tag": "150 à 2 000 personnes", "prix": "18 000 €", "unite": "HT",
 "titre": "Organisation de convention d'entreprise",
 "meta": "Organisation de conventions annuelles, assemblées générales et conférences clients, de 150 à 2 000 personnes. Scénographie, régie générale, captation. Devis sous 48 h.",
 "chapo": "Conventions annuelles, assemblées générales, plénières et conférences clients. Le format le plus exigeant : une scène, un conducteur à la minute, des intervenants préparés et une salle qui suit.",
 "pour_qui": ["Groupes réunissant leurs collaborateurs une fois par an", "Sociétés cotées tenant leur assemblée générale",
              "Éditeurs et industriels organisant leur conférence clients", "Fédérations et organisations professionnelles"],
 "inclus": [
   ("Scénographie de plénière et habillage scénique", "Scène, décor, écrans, mise en lumière et déclinaison de votre identité sur l'ensemble des supports."),
   ("Régie générale, captation et retransmission", "Régisseur général, équipes son, lumière et vidéo, captation multicaméra et diffusion en direct si besoin."),
   ("Coaching des intervenants et conducteur minuté", "Répétitions, réécriture des prises de parole, prompteur et conducteur partagé en temps réel."),
   ("Traduction simultanée et accessibilité", "Cabines d'interprétation, casques, sous-titrage en direct et places réservées."),
   ("Application participants et interactivité", "Programme, plan, questions du public, votes en direct et export des résultats."),
 ],
 "exclus": ["La production de contenus vidéo longs, chiffrée à part",
            "Les frais de déplacement et d'hébergement des participants"],
 "deroule": [("J-120", "Cadrage, choix du lieu et budget prévisionnel détaillé"),
             ("J-60", "Scénographie validée, prestataires contractualisés, ouverture des inscriptions"),
             ("J-15", "Répétitions intervenants, conducteur figé, plan de prévention déposé"),
             ("Jour J", "Montage la veille, régie générale, démontage et bilan à chaud")],
 "faq": [("À partir de combien de participants parle-t-on de convention ?",
          "En pratique, au-delà de 150 personnes le dispositif change de nature : il faut une régie générale, un conducteur minuté et une logistique d'accueil. C'est là que ce pack commence."),
         ("Assurez-vous la retransmission en direct ?",
          "Oui, en captation multicaméra avec diffusion sur votre intranet ou une plateforme dédiée, et enregistrement livré après l'événement."),
         ("Quel délai pour une convention de 500 personnes ?",
          "Trois à quatre mois dans des conditions normales. Nous avons déjà monté des conventions de cette taille en six semaines, avec un choix de lieux restreint.")],
 "cas": ("convention", "Réunir 850 collaborateurs sur deux jours", "Convention plénière et ateliers pour un groupe industriel, montée en six semaines après un changement de lieu de dernière minute."),
},
{
 "slug": "lancement-produit", "nom": "Pack Lancement produit", "form": "Pack Lancement produit",
 "tag": "Presse, clients, réseau", "prix": "12 000 €", "unite": "HT",
 "titre": "Organisation de lancement produit et roadshow",
 "meta": "Organisation de lancements produit, inaugurations et roadshows multi-villes. Mise en scène, relations presse, contenus livrés sous 72 h. Devis sous 48 h.",
 "chapo": "Lancements, inaugurations, roadshows multi-villes et salons professionnels. Un dispositif pensé pour que le produit soit vu, compris et repris.",
 "pour_qui": ["Directions marketing lançant une gamme", "Industriels inaugurant un site",
              "Éditeurs en tournée commerciale", "Marques exposant sur un salon professionnel"],
 "inclus": [
   ("Mise en scène produit et parcours de découverte", "Réveil produit, éclairage dédié, parcours guidé et démonstrations cadencées."),
   ("Stand ou showroom éphémère sur mesure", "Conception, fabrication, montage et démontage, stockage entre deux étapes."),
   ("Relations presse et gestion des accréditations", "Fichier presse, invitations, accréditations, espace dédié et accompagnement sur place."),
   ("Contenus vidéo et photo livrés sous 72 h", "Photographe et vidéaste sur place, sélection retouchée et aftermovie court."),
   ("Réplication du dispositif sur plusieurs villes", "Même scénographie, équipes locales, logistique centralisée et calendrier unique."),
 ],
 "exclus": ["L'achat d'espace publicitaire et le média payant",
            "La production du produit lui-même et de ses packagings"],
 "deroule": [("J-60", "Concept, message et sélection des lieux ou du salon"),
             ("J-30", "Fabrication de la scénographie, envoi des invitations presse"),
             ("J-7", "Montage à blanc, répétition des démonstrations"),
             ("Jour J", "Accueil, régie, captation, puis livraison des contenus sous 72 h")],
 "faq": [("Gérez-vous les relations presse ?",
          "Nous gérons les accréditations, l'accueil et l'espace presse le jour J. La stratégie de relations presse au long cours relève de votre agence RP, avec qui nous travaillons volontiers."),
         ("Peut-on répliquer le dispositif dans plusieurs villes ?",
          "C'est précisément l'objet du format roadshow : une scénographie transportable, des équipes locales et une logistique centralisée. Le coût par ville décroît fortement après la première."),
         ("Sous quel délai récupère-t-on les photos et vidéos ?",
          "Une sélection retouchée sous 72 h, l'aftermovie monté sous une semaine.")],
 "cas": ("lancement", "Une révélation devant presse et réseau", "Mise en scène produit, parcours de découverte et gestion des accréditations pour un lancement européen."),
},
{
 "slug": "soiree-de-gala", "nom": "Pack Soirée de gala", "form": "Pack Soirée de gala",
 "tag": "Soirées d'entreprise", "prix": "9 500 €", "unite": "HT",
 "titre": "Organisation de soirée de gala et remise de prix",
 "meta": "Organisation de dîners de gala, remises de prix et soirées de fin d'année. Lieu d'exception, dîner signé, programmation artistique. Devis sous 48 h.",
 "chapo": "Dîners de gala, remises de prix, anniversaires d'entreprise et soirées de fin d'année. Le moment où la forme compte autant que le fond.",
 "pour_qui": ["Entreprises fêtant un anniversaire ou un cap", "Groupes organisant leur soirée de fin d'année",
              "Fédérations remettant des trophées", "Directions commerciales célébrant leurs résultats"],
 "inclus": [
   ("Privatisation de lieux d'exception", "Hôtels particuliers, monuments, rooftops : négociation, contrat et autorisations administratives."),
   ("Dîner assis ou cocktail dînatoire signé", "Sélection du traiteur, dégustation préalable, service en salle et accords mets-vins."),
   ("Cérémonie de remise de prix et trophées", "Écriture du déroulé, régie de la cérémonie, fabrication des trophées, prompteur."),
   ("Programmation artistique et musicale", "Booking, contrats et déclarations, régie artistique et loges."),
   ("Vestiaire, accueil VIP et voiturier", "Personnel d'accueil, plan de table, gestion des invités prioritaires et sécurité."),
 ],
 "exclus": ["Les cadeaux et dotations remis aux invités",
            "Les nuitées d'hôtel des convives"],
 "deroule": [("J-90", "Repérage des lieux, définition de l'ambiance et du déroulé"),
             ("J-45", "Traiteur retenu après dégustation, artistes contractualisés"),
             ("J-10", "Plan de table figé, brief du personnel, répétition de la cérémonie"),
             ("Jour J", "Montage, accueil, régie de soirée, démontage de nuit")],
 "faq": [("Prenez-vous en charge les autorisations et la sécurité ?",
          "Oui : autorisations d'occupation, déclarations SACEM, agents de sécurité et plan de prévention font partie de la mission."),
         ("Jusqu'à quelle heure peut-on prolonger la soirée ?",
          "Cela dépend du lieu et de son arrêté d'exploitation. Nous vérifions ce point avant même de vous proposer une adresse."),
         ("Peut-on organiser une remise de prix sans dîner ?",
          "Oui, en format cocktail ou cérémonie seule. Le tarif de départ s'ajuste à la baisse en conséquence.")],
 "cas": ("gala", "Remise de prix et dîner assis", "Privatisation d'un lieu patrimonial, cérémonie de remise de trophées et programmation artistique jusqu'à 2 h."),
},
{
 "slug": "team-building", "nom": "Pack Team building", "form": "Pack Team building",
 "tag": "Cohésion d'équipe", "prix": "3 900 €", "unite": "HT",
 "titre": "Organisation de team building et journée de cohésion",
 "meta": "Organisation de team building, journées de cohésion et incentives. Cadrage RH, activités adaptées, animateurs professionnels. Devis sous 48 h.",
 "chapo": "Journées de cohésion, incentives et séminaires d'intégration, en intérieur ou en extérieur. Une journée conçue à partir d'un objectif RH, pas d'un catalogue d'activités.",
 "pour_qui": ["Équipes après une fusion ou une réorganisation", "Services accueillant plusieurs arrivées",
              "Équipes distantes se réunissant physiquement", "Directions souhaitant récompenser un résultat"],
 "inclus": [
   ("Atelier de cadrage des objectifs RH", "Un échange préalable pour définir ce que la journée doit produire, et comment on le mesurera."),
   ("Activités adaptées aux effectifs et à la mobilité", "Aucune activité excluante : chaque format est vérifié sur la condition physique et l'accessibilité."),
   ("Animateurs professionnels et matériel fourni", "Encadrement diplômé, assurance, matériel livré et repris sur site."),
   ("Restauration et logistique sur site", "Déjeuner, pauses, sanitaires, plan B météo pour tout format extérieur."),
   ("Bilan de satisfaction post-événement", "Questionnaire à chaud, synthèse chiffrée et recommandations pour la prochaine édition."),
 ],
 "exclus": ["Les séjours de plusieurs nuits — voir le Pack Séminaire",
            "Les activités à risque nécessitant une qualification individuelle"],
 "deroule": [("J-30", "Cadrage RH, choix du format et du lieu"),
             ("J-15", "Réservation, plan B météo, communication interne"),
             ("J-2", "Confirmation des effectifs, brief des animateurs"),
             ("Jour J", "Encadrement, logistique, questionnaire de satisfaction à chaud")],
 "faq": [("Comment éviter les activités qui excluent une partie de l'équipe ?",
          "C'est l'objet du cadrage préalable. Nous écartons systématiquement les formats reposant sur la performance physique ou la mise en avant individuelle si l'objectif est la cohésion."),
         ("Que se passe-t-il en cas de mauvais temps ?",
          "Tout format extérieur est réservé avec un plan B intérieur, décidé la veille et sans surcoût."),
         ("Le team building peut-il s'intégrer à un séminaire ?",
          "Oui, et c'est fréquent : une demi-journée de cohésion insérée dans un séminaire de deux jours. Le devis est alors global.")],
 "cas": ("team-building", "Deux cents personnes, une seule équipe", "Journée de cohésion en extérieur après une fusion : ateliers par équipes mixtes et bilan de satisfaction à chaud."),
},
{
 "slug": "sur-mesure", "nom": "Pack Sur-mesure", "form": "Pack Sur-mesure",
 "tag": "Dispositifs annuels", "prix": "Sur devis", "unite": "",
 "titre": "Événements sur-mesure et dispositifs annuels",
 "meta": "Programmes événementiels pluriannuels, tournées internationales, marchés publics et formats hors catalogue. Accompagnement au forfait ou en régie. Devis sous 48 h.",
 "chapo": "Programmes pluriannuels, tournées internationales et formats qui n'entrent dans aucune case. Quand le besoin ne ressemble à aucun pack, on construit le pack.",
 "pour_qui": ["Groupes confiant leur programme événementiel annuel", "Organisations opérant sur plusieurs pays",
              "Acheteurs publics passant par appel d'offres", "Directions cherchant un accompagnement en régie"],
 "inclus": [
   ("Accompagnement au forfait ou en régie", "Un budget annuel et une équipe dédiée, ou une facturation à la mission selon votre mode de fonctionnement."),
   ("Événements multi-sites et multi-pays", "Coordination centralisée, partenaires locaux, conformité réglementaire par pays."),
   ("Appels d'offres et marchés publics", "Dossier administratif complet, mémoire technique, respect des délais de la consultation."),
   ("Charte événementielle et kit de marque", "Un référentiel réutilisable par vos équipes et vos autres prestataires."),
   ("Reporting budgétaire et bilan carbone", "Suivi consolidé des dépenses et estimation de l'empreinte de chaque événement."),
 ],
 "exclus": [],
 "deroule": [("Semaine 1", "Atelier de cadrage et audit de l'existant"),
             ("Semaine 3", "Proposition de dispositif, budget-cadre et gouvernance"),
             ("Continu", "Production des événements du programme, points d'avancement mensuels"),
             ("Annuel", "Bilan consolidé, reporting budgétaire et carbone, plan de l'année suivante")],
 "faq": [("Travaillez-vous en marchés publics ?",
          "Oui. Nous fournissons l'ensemble des pièces administratives — attestations URSSAF, RC Pro, références — et répondons aux consultations publiques comme privées."),
         ("Peut-on vous confier seulement une partie de l'événement ?",
          "Oui. Nous intervenons aussi en régie seule, en production technique ou en conseil, en complément d'une équipe interne déjà en place."),
         ("Comment est facturé un accompagnement annuel ?",
          "Soit au forfait, avec une enveloppe et un périmètre définis à l'année, soit à la mission. Le mode est arrêté au cadrage, jamais en cours de route.")],
 "cas": ("roadshow", "Sept villes en trois semaines", "Dispositif répliqué à l'identique dans sept métropoles, avec équipes locales et logistique centralisée."),
},
]

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
        for a in autres if a["slug"] != p["slug"])

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

<header class="site-header scrolled" id="top">
  <div class="wrap header-inner">
    <a class="brand" href="../index.html" aria-label="{NOM} — accueil">
      <span class="brand-gem" aria-hidden="true">{LOGO}</span>
      <span class="brand-text"><strong>RUBIS</strong><em>Événements</em></span>
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


def main():
    dossier = os.path.join(RACINE, "packs")
    os.makedirs(dossier, exist_ok=True)
    for p in PACKS:
        chemin = os.path.join(dossier, p["slug"] + ".html")
        with open(chemin, "w", encoding="utf-8") as f:
            f.write(page(p, PACKS))
        print(f"packs/{p['slug']}.html".ljust(34), f"{os.path.getsize(chemin)/1024:.1f} Ko")

    # ── sitemap ─────────────────────────────────────────────────────────
    aujourd_hui = datetime.date.today().isoformat()
    urls = [(SITE + "/", "1.0", "weekly")]
    urls += [(f"{SITE}/packs/{p['slug']}.html", "0.8", "monthly") for p in PACKS]
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
