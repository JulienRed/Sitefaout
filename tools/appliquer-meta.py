# -*- coding: utf-8 -*-
"""Applique le socle SEO/social commun à toutes les pages HTML existantes.
Idempotent : relancer le script ne duplique rien.

    python3 tools/appliquer-meta.py
"""
import glob, os, re

SITE = "https://www.rubis-evenements.fr"   # ← domaine définitif à ajuster ici
NOM = "Rubis Événements"

PAGES = {
    "index.html":            ("", "Agence événementielle corporate"),
    "merci.html":            ("merci.html", "Demande envoyée"),
    "mentions-legales.html": ("mentions-legales.html", "Mentions légales"),
    "confidentialite.html":  ("confidentialite.html", "Politique de confidentialité"),
}
for f in sorted(glob.glob("packs/*.html")):
    PAGES[f] = (f, "Pack")

MARQUE_DEBUT = "<!-- socle social & icônes — généré par tools/appliquer-meta.py -->"
MARQUE_FIN   = "<!-- /socle -->"

def bloc(chemin_relatif, prefixe):
    url = f"{SITE}/{chemin_relatif}" if chemin_relatif else SITE + "/"
    return f"""{MARQUE_DEBUT}
<link rel="canonical" href="{url}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="{NOM}">
<meta property="og:locale" content="fr_FR">
<meta property="og:image" content="{SITE}/assets/img/og-cover.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{NOM} — agence événementielle corporate">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}/assets/img/og-cover.png">
<link rel="apple-touch-icon" href="{prefixe}assets/img/favicon-180.png">
<link rel="icon" href="{prefixe}assets/img/favicon-32.png" sizes="32x32" type="image/png">
{MARQUE_FIN}"""

for fichier, (rel, _) in PAGES.items():
    if not os.path.exists(fichier):
        continue
    with open(fichier, encoding="utf-8") as f:
        s = f.read()

    prefixe = "../" if fichier.startswith("packs/") else ""

    # retire un socle précédent
    s = re.sub(re.escape(MARQUE_DEBUT) + r".*?" + re.escape(MARQUE_FIN) + r"\n?",
               "", s, flags=re.S)
    # og:image relatif de la première version : remplacé par le bloc
    s = s.replace('<meta property="og:image" content="assets/img/logo.svg">\n', "")

    ancre = '<link rel="stylesheet"'
    assert ancre in s, fichier
    s = s.replace(ancre, bloc(rel, prefixe) + "\n" + ancre, 1)

    with open(fichier, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"socle appliqué : {fichier}")
