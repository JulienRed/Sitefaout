# -*- coding: utf-8 -*-
"""Génère les scènes illustratives de la section Réalisations.
Vocabulaire graphique du site : fond quasi noir, rouge rubis, filets blancs
très discrets, géométrie en perspective. Aucune photo, aucun visage."""
import math, os, random

OUT = "/home/user/Sitefaout/assets/img/realisations"
W, H = 800, 500
NOIR, ROUGE, ROUGE_CLAIR = "#0a0b0d", "#c8102e", "#e2233d"

def head(extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
            f'width="{W}" height="{H}" role="img">{extra}')

DEFS = f'''<defs>
<linearGradient id="fond" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#12070b"/><stop offset="55%" stop-color="{NOIR}"/>
  <stop offset="100%" stop-color="#070809"/>
</linearGradient>
<radialGradient id="halo" cx="50%" cy="18%" r="62%">
  <stop offset="0%" stop-color="{ROUGE}" stop-opacity=".38"/>
  <stop offset="100%" stop-color="{ROUGE}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="faisceau" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="{ROUGE_CLAIR}" stop-opacity=".34"/>
  <stop offset="100%" stop-color="{ROUGE_CLAIR}" stop-opacity="0"/>
</linearGradient>
<linearGradient id="bords" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#0a0b0d" stop-opacity="1"/>
  <stop offset="12%" stop-color="#0a0b0d" stop-opacity="0"/>
  <stop offset="88%" stop-color="#0a0b0d" stop-opacity="0"/>
  <stop offset="100%" stop-color="#0a0b0d" stop-opacity="1"/>
</linearGradient>
<linearGradient id="sol" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#ffffff" stop-opacity=".07"/>
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
</defs>'''

def base(halo=True):
    s = f'<rect width="{W}" height="{H}" fill="url(#fond)"/>'
    if halo:
        s += f'<rect width="{W}" height="{H}" fill="url(#halo)"/>'
    return s

def grille_sol(y0=300, lignes=9, fuite=(400, 170)):
    """Sol en perspective : fuyantes + transversales."""
    fx, fy = fuite
    out = ['<g stroke="#ffffff" stroke-opacity=".07" stroke-width="1" fill="none">']
    for i in range(-6, 7):
        x = fx + i * 190
        out.append(f'<line x1="{fx + i*22:.0f}" y1="{y0}" x2="{x:.0f}" y2="{H}"/>')
    for i in range(lignes):
        t = i / (lignes - 1)
        y = y0 + (H - y0) * (t ** 2.1)
        out.append(f'<line x1="0" y1="{y:.0f}" x2="{W}" y2="{y:.0f}" stroke-opacity="{.06 + .05*t:.2f}"/>')
    out.append('</g>')
    return "".join(out)

def sieges(y0=318, rangs=8, par_rang=26, actifs=0.34):
    """Rangées de sièges en perspective, certaines occupées (points rouges)."""
    random.seed(7)
    out = ['<g>']
    for r in range(rangs):
        t = r / (rangs - 1)
        y = y0 + (H - y0 - 24) * (t ** 1.55)
        ecart = 11 + 12 * t
        taille = 1.4 + 2.2 * t
        n = int(par_rang * (0.5 + 0.5 * t))
        for c in range(n):
            x = W / 2 + (c - (n - 1) / 2) * ecart
            if x < -10 or x > W + 10:
                continue
            if random.random() < actifs:
                out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{taille:.1f}" fill="{ROUGE_CLAIR}" opacity="{.35+.45*t:.2f}"/>')
            else:
                out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{taille:.1f}" fill="#ffffff" opacity="{.13+.16*t:.2f}"/>')
    out.append('</g>')
    return "".join(out)

def faisceaux(sources, largeur=120, hauteur=300):
    out = []
    for (x, ang) in sources:
        out.append(f'<g transform="translate({x} 0) rotate({ang} 0 0)">'
                   f'<path d="M-{largeur*0.13:.0f} 0 L{largeur*0.13:.0f} 0 '
                   f'L{largeur/2:.0f} {hauteur} L-{largeur/2:.0f} {hauteur} Z" '
                   f'fill="url(#faisceau)"/></g>')
    return "".join(out)

def bords():
    return f'<rect width="{W}" height="{H}" fill="url(#bords)"/>'

def cadre():
    """Filet de contour + coins, signature commune à toutes les scènes."""
    c = 18
    g = [f'<g stroke="{ROUGE}" stroke-opacity=".55" stroke-width="1.5" fill="none">']
    for (x, y, dx, dy) in [(24,24,1,1), (W-24,24,-1,1), (24,H-24,1,-1), (W-24,H-24,-1,-1)]:
        g.append(f'<path d="M{x} {y+dy*c} L{x} {y} L{x+dx*c} {y}"/>')
    g.append('</g>')
    return "".join(g)

# ── 1. Convention plénière ──────────────────────────────────────────────
def convention():
    s = [head(), DEFS, base(), grille_sol(300)]
    s.append(faisceaux([(250, -14), (400, 0), (550, 14)], 150, 330))
    # écran de scène
    s.append(f'<rect x="250" y="96" width="300" height="132" rx="2" fill="#140a0e" '
             f'stroke="#ffffff" stroke-opacity=".12"/>')
    s.append(f'<rect x="250" y="96" width="300" height="132" fill="{ROUGE}" opacity=".14"/>')
    s.append(f'<path d="M262 214 L300 150 L336 186 L372 132 L410 178 L448 122 L486 166 L538 112" '
             f'fill="none" stroke="{ROUGE_CLAIR}" stroke-width="2" stroke-opacity=".85"/>')
    # estrade
    s.append(f'<rect x="214" y="252" width="372" height="10" fill="{ROUGE}" opacity=".5"/>')
    s.append(f'<rect x="214" y="262" width="372" height="26" fill="url(#sol)"/>')
    # pupitre + silhouette abstraite
    s.append(f'<rect x="386" y="222" width="28" height="30" fill="#1a1013" stroke="{ROUGE}" stroke-opacity=".5"/>')
    s.append(sieges(316, 7, 22, .38))
    s.append(bords())
    s.append(cadre())
    s.append('</svg>')
    return "".join(s)

# ── 2. Séminaire résidentiel ────────────────────────────────────────────
def seminaire():
    s = [head(), DEFS, base()]
    # baies vitrées
    for i in range(4):
        x = 60 + i * 178
        s.append(f'<rect x="{x}" y="60" width="150" height="180" fill="#0f1418" '
                 f'stroke="#ffffff" stroke-opacity=".10"/>')
        s.append(f'<rect x="{x}" y="60" width="150" height="180" fill="{ROUGE}" opacity=".07"/>')
        s.append(f'<path d="M{x} 214 L{x+48} 172 L{x+88} 200 L{x+150} 156 L{x+150} 240 L{x} 240 Z" '
                 f'fill="#060708" opacity=".9"/>')
        s.append(f'<line x1="{x+75}" y1="60" x2="{x+75}" y2="240" stroke="#ffffff" stroke-opacity=".07"/>')
    s.append(grille_sol(286, 8))
    # tables en U
    s.append(f'<g fill="none" stroke="{ROUGE_CLAIR}" stroke-opacity=".75" stroke-width="2.5">'
             f'<path d="M232 430 L232 336 L568 336 L568 430"/></g>')
    s.append(f'<g fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="1">'
             f'<path d="M244 442 L244 348 L556 348 L556 442"/></g>')
    random.seed(3)
    for i in range(9):
        x = 250 + i * 37
        s.append(f'<circle cx="{x}" cy="318" r="5" fill="#ffffff" opacity=".22"/>')
    for i in range(5):
        y = 356 + i * 20
        s.append(f'<circle cx="212" cy="{y}" r="5" fill="{ROUGE_CLAIR}" opacity=".55"/>')
        s.append(f'<circle cx="588" cy="{y}" r="5" fill="{ROUGE_CLAIR}" opacity=".55"/>')
    # paperboard
    s.append(f'<rect x="620" y="300" width="96" height="120" fill="#12161a" stroke="#ffffff" stroke-opacity=".12"/>')
    s.append(f'<path d="M636 330 h64 M636 352 h48 M636 374 h56" stroke="{ROUGE}" stroke-opacity=".7" stroke-width="2"/>')
    s.append(bords())
    s.append(cadre())
    s.append('</svg>')
    return "".join(s)

# ── 3. Lancement produit ────────────────────────────────────────────────
def lancement():
    s = [head(), DEFS, base()]
    s.append(grille_sol(310, 8))
    s.append(faisceaux([(400, 0)], 210, 340))
    # ondes
    for i, r in enumerate((86, 132, 178, 224)):
        s.append(f'<ellipse cx="400" cy="352" rx="{r}" ry="{r*0.3:.0f}" fill="none" '
                 f'stroke="{ROUGE_CLAIR}" stroke-opacity="{0.5 - i*0.11:.2f}" stroke-width="1.4"/>')
    # socle + objet
    s.append(f'<ellipse cx="400" cy="352" rx="72" ry="20" fill="{ROUGE}" opacity=".2"/>')
    s.append(f'<path d="M370 200 h60 l22 24 -52 86 -52 -86 z" fill="{ROUGE}" opacity=".9"/>')
    s.append(f'<path d="M370 200 h60 l22 24 h-104 z" fill="{ROUGE_CLAIR}"/>')
    s.append(f'<path d="M348 224 h104 M400 224 v86" stroke="#ffffff" stroke-opacity=".35" stroke-width="1"/>')
    s.append(f'<ellipse cx="400" cy="330" rx="52" ry="14" fill="#000" opacity=".45"/>')
    # public en contre-jour
    random.seed(11)
    for i in range(22):
        x = 40 + i * 34 + random.randint(-8, 8)
        h = random.randint(46, 82)
        s.append(f'<rect x="{x}" y="{H-h}" width="18" height="{h}" rx="9" fill="#05060700" '
                 f'style="fill:#050607;opacity:.85"/>')
        s.append(f'<circle cx="{x+9}" cy="{H-h-8}" r="9" fill="#050607" opacity=".85"/>')
    s.append(cadre())
    s.append('</svg>')
    return "".join(s)

# ── 4. Soirée de gala ───────────────────────────────────────────────────
def gala():
    s = [head(), DEFS, base()]
    # colonnade
    for i in range(9):
        x = 30 + i * 92
        s.append(f'<rect x="{x}" y="40" width="26" height="240" fill="#ffffff" opacity=".04"/>')
        s.append(f'<rect x="{x}" y="40" width="26" height="240" fill="none" stroke="#ffffff" stroke-opacity=".07"/>')
    # lustre
    random.seed(5)
    for i in range(46):
        x = 200 + random.random() * 400
        y = 40 + random.random() * 120
        r = 1 + random.random() * 1.8
        s.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="#fff" opacity="{.25+random.random()*.5:.2f}"/>')
    s.append(f'<ellipse cx="400" cy="96" rx="150" ry="52" fill="{ROUGE}" opacity=".10"/>')
    s.append(grille_sol(300, 7))
    # tables rondes dressées
    for (cx, cy, rx) in [(200, 372, 74), (600, 372, 74), (400, 428, 92), (400, 316, 58)]:
        ry = rx * 0.34
        s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry:.0f}" fill="#14090d" '
                 f'stroke="{ROUGE_CLAIR}" stroke-opacity=".55"/>')
        s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx*0.42:.0f}" ry="{ry*0.42:.0f}" '
                 f'fill="none" stroke="#ffffff" stroke-opacity=".14"/>')
        n = 8
        for k in range(n):
            a = 2 * math.pi * k / n
            px = cx + math.cos(a) * (rx + 14)
            py = cy + math.sin(a) * (ry + 7)
            s.append(f'<circle cx="{px:.0f}" cy="{py:.0f}" r="4.5" fill="#ffffff" opacity=".2"/>')
        s.append(f'<circle cx="{cx}" cy="{cy - ry*0.2:.0f}" r="3" fill="{ROUGE_CLAIR}"/>')
    s.append(cadre())
    s.append('</svg>')
    return "".join(s)

# ── 5. Team building ────────────────────────────────────────────────────
def team():
    s = [head(), DEFS, base(False)]
    # collines
    s.append(f'<path d="M0 330 Q160 268 320 322 T640 300 T800 340 L800 500 L0 500 Z" fill="#0d1014"/>')
    s.append(f'<path d="M0 384 Q200 330 400 378 T800 366 L800 500 L0 500 Z" fill="#0a0c0f"/>')
    s.append(f'<circle cx="640" cy="120" r="54" fill="{ROUGE}" opacity=".18"/>')
    s.append(f'<circle cx="640" cy="120" r="28" fill="{ROUGE_CLAIR}" opacity=".55"/>')
    # réseau d'équipes
    pts = [(150, 300), (250, 236), (352, 292), (452, 226), (556, 286), (656, 240), (300, 372), (500, 366)]
    s.append(f'<g stroke="{ROUGE_CLAIR}" stroke-opacity=".55" stroke-width="1.6" fill="none">')
    liens = [(0,1),(1,2),(2,3),(3,4),(4,5),(0,6),(6,2),(2,7),(7,4),(6,7)]
    for a, b in liens:
        s.append(f'<line x1="{pts[a][0]}" y1="{pts[a][1]}" x2="{pts[b][0]}" y2="{pts[b][1]}"/>')
    s.append('</g>')
    for i, (x, y) in enumerate(pts):
        s.append(f'<circle cx="{x}" cy="{y}" r="{9 if i%3==0 else 6.5}" fill="{NOIR}" '
                 f'stroke="{"#fff" if i%3==0 else ROUGE_CLAIR}" stroke-width="2"/>')
    # tentes / ateliers
    for x in (110, 690):
        s.append(f'<path d="M{x-34} 430 L{x} 372 L{x+34} 430 Z" fill="#12161a" '
                 f'stroke="#ffffff" stroke-opacity=".14"/>')
    s.append(cadre())
    s.append('</svg>')
    return "".join(s)

# ── 6. Roadshow multi-villes ────────────────────────────────────────────
def roadshow():
    s = [head(), DEFS, base()]
    # trame de carte
    s.append('<g stroke="#ffffff" stroke-opacity=".05" stroke-width="1">')
    for i in range(1, 12):
        s.append(f'<line x1="{i*66}" y1="0" x2="{i*66}" y2="{H}"/>')
    for i in range(1, 8):
        s.append(f'<line x1="0" y1="{i*62}" x2="{W}" y2="{i*62}"/>')
    s.append('</g>')
    villes = [(126, 350), (232, 214), (352, 320), (438, 158), (546, 268), (652, 190), (712, 356)]
    # trajets en arcs
    s.append(f'<g fill="none" stroke="{ROUGE}" stroke-opacity=".55" stroke-width="1.8" stroke-dasharray="7 6">')
    for i in range(len(villes) - 1):
        x1, y1 = villes[i]; x2, y2 = villes[i+1]
        mx, my = (x1+x2)/2, min(y1, y2) - 62
        s.append(f'<path d="M{x1} {y1} Q{mx:.0f} {my:.0f} {x2} {y2}"/>')
    s.append('</g>')
    for i, (x, y) in enumerate(villes):
        s.append(f'<circle cx="{x}" cy="{y}" r="{20 - i%3*4}" fill="{ROUGE}" opacity=".13"/>')
        s.append(f'<circle cx="{x}" cy="{y}" r="6" fill="{NOIR}" stroke="{ROUGE_CLAIR}" stroke-width="2.4"/>')
        s.append(f'<line x1="{x}" y1="{y+8}" x2="{x}" y2="{y+26}" stroke="#ffffff" stroke-opacity=".18"/>')
    s.append(f'<circle cx="438" cy="158" r="11" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>')
    s.append(cadre())
    s.append('</svg>')
    return "".join(s)

SCENES = {
    "convention": convention, "seminaire": seminaire, "lancement": lancement,
    "gala": gala, "team-building": team, "roadshow": roadshow,
}
os.makedirs(OUT, exist_ok=True)
for nom, fn in SCENES.items():
    chemin = os.path.join(OUT, nom + ".svg")
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(fn())
    print(f"{nom+'.svg':22s} {os.path.getsize(chemin)/1024:.1f} Ko")
