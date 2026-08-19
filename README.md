# EDB Événement — site vitrine

Site vitrine pour une agence événementielle **corporate (B2B)** : séminaires,
conventions, lancements produit, soirées de gala, team building. Thème noir &
rouge rubis, registre sobre, formulaire de devis en deux étapes envoyé par e-mail
via une fonction serverless.

## Contenu

```
index.html               page principale (hero, expertises, packs, réalisations,
                         méthode, engagements, références, FAQ, devis)
packs/*.html             page dédiée par pack disponible (générées)
billetterie.html         vente de billets en ligne
cgv.html                 conditions générales de vente
verifier-billet.html     contrôle des billets à l'entrée
data/billetterie.json    catalogue des événements (fait autorité)
404.html                 page d'erreur
robots.txt, sitemap.xml  socle d'indexation (générés)
merci.html               confirmation après envoi — c'est elle qui rend la
                         conversion mesurable
mentions-legales.html    mentions légales (à compléter)
confidentialite.html     politique de confidentialité (à compléter)

assets/css/styles.css    thème, animations, responsive
assets/js/main.js        étapes du formulaire, envoi, animations, FAQ
assets/fonts/            Inter variable auto-hébergé (SIL OFL)
assets/img/logo.svg      logo rubis, également favicon
assets/img/realisations/ scènes illustratives des études de cas (SVG générés)
tools/                   générateurs et audit automatisé
.github/workflows/       contrôle qualité à chaque push et pull request

server/devis.js          traitement du devis (validation, anti-robot, e-mails)
server/billetterie.js    catalogue, quotas et création du paiement Stripe
server/billets.js        émission et vérification des codes de billets
server/stripe-webhook.js émission des billets après paiement confirmé
netlify/functions/       adaptateur Netlify
api/devis.js             adaptateur Vercel
netlify.toml             publication + en-têtes + redirection /api/devis
vercel.json              en-têtes
.env.example             modèle des variables d'environnement
.mcp.json                serveur MCP 21st.dev (clé via variable d'env)
.claude/skills/          bundle de skills design ui-ux-pro-max
```

## Lancer le site en local

```bash
npm install     # une seule fois — installe playwright et qrcode
npm start       # http://localhost:8080
```

**Servez toujours le site par ce serveur, jamais en ouvrant les fichiers HTML
directement.** Les pages appellent `/api/…` ; sans serveur derrière, la
billetterie affiche « la billetterie n'est pas encore accessible » et le
formulaire de devis bascule sur le client mail.

Le serveur s'adapte à ce qui est configuré :

| Sans | Comportement |
|---|---|
| `STRIPE_SECRET_KEY` | paiement **simulé** : un écran local remplace la page Stripe, puis un webhook signé est rejoué vers le vrai gestionnaire — toute la chaîne s'exécute, sans banque |
| `RESEND_API_KEY` | e-mails **écrits sur disque** dans `.local/emails/`, consultables sur `/__emails`, QR codes compris |

Avec les vraies clés dans l'environnement, le comportement est identique à la
production.

> **L'écran de paiement simulé n'existe que dans `tools/serveur-local.mjs`**, qui
> n'est jamais déployé. Aucun chemin de production ne permet d'émettre un billet
> sans passer par Stripe.

### Essai complet en une minute

1. `npm start`
2. Ouvrez `/billetterie.html`, choisissez des billets, cliquez **Réserver**.
3. Sur l'écran de paiement simulé, validez.
4. La page de confirmation affiche la référence de commande.
5. Ouvrez `/__emails` : les billets et leurs QR codes sont là.
6. Copiez un code dans `/verifier-billet.html` — il doit être accepté ; changez
   un caractère, il doit être refusé.

## Mise en ligne

### Netlify

1. Connectez le dépôt — `netlify.toml` fait le reste (publication à la racine,
   fonctions dans `netlify/functions`, redirection de `/api/devis`, en-têtes de
   sécurité dont une CSP stricte sans `unsafe-inline`).
2. Renseignez les variables d'environnement listées ci-dessous.

### Vercel

1. Importez le dépôt, aucun framework à sélectionner.
2. `api/devis.js` est détecté automatiquement comme fonction.
3. Renseignez les mêmes variables d'environnement.

### Variables d'environnement

Voir `.env.example`. À définir dans l'interface de l'hébergeur, jamais dans le dépôt.

| Variable | Rôle |
|---|---|
| `RESEND_API_KEY` | clé API [Resend](https://resend.com) — obligatoire |
| `DEVIS_FROM` | expéditeur, domaine vérifié dans Resend — obligatoire |
| `DEVIS_TO` | boîte qui reçoit les demandes — obligatoire |
| `DEVIS_BCC` | copie cachée interne (facultatif) |
| `SITE_NAME` | nom affiché dans les e-mails (facultatif) |
| `TURNSTILE_SECRET` | clé secrète Cloudflare Turnstile — nécessaire à l'accusé de réception |
| `STRIPE_SECRET_KEY` | clé secrète Stripe — obligatoire pour la billetterie |
| `STRIPE_WEBHOOK_SECRET` | secret de signature du webhook Stripe |
| `BILLET_SECRET` | clé de signature des billets, 32 caractères minimum |
| `SITE_URL` | base des URL de retour après paiement |

### Anti-robot Turnstile (recommandé)

1. Créez un widget sur [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).
2. Clé **publique** → `TURNSTILE_SITE_KEY` dans `assets/js/main.js`.
3. Clé **secrète** → variable d'environnement `TURNSTILE_SECRET`.

Tant que la clé publique est vide, aucune ressource tierce n'est chargée et seul
le pot de miel protège le formulaire.

**Sans Turnstile, l'accusé de réception au prospect n'est pas envoyé.** Cet
e-mail part vers une adresse fournie par l'appelant et reprend son texte libre :
envoyé sans contrôle, il permettrait à n'importe qui d'adresser le message de
son choix à la victime de son choix, depuis votre domaine vérifié. Les demandes
vous parviennent toujours dans les deux cas — seule la réponse automatique est
conditionnée.

## Outils de développement

### Skills de design (`.claude/skills/`)

Le bundle [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
est versionné dans le dépôt : il est donc actif pour toute session Claude Code
ouverte sur ce projet, sans installation supplémentaire. Base de règles UI/UX
interrogeable :

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<requête>" --domain ux
```

Les règles tactiles et de conversion qu'il porte ont servi à l'audit du site
(cibles 44 × 44 px, barre d'action mobile). Sa palette et ses polices par défaut
ne sont volontairement pas suivies : l'identité noir et rouge rubis prime.

### Serveur MCP 21st.dev (`.mcp.json`)

Configuré au niveau du projet. **La clé n'est pas dans le dépôt** — le fichier
référence la variable d'environnement `TWENTYFIRST_API_KEY`, que Claude Code
substitue au démarrage :

```bash
export TWENTYFIRST_API_KEY="21st_sk_…"   # à mettre dans votre shell, pas ici
```

Sans cette variable, Claude Code signale `Missing environment variables:
TWENTYFIRST_API_KEY` et ignore simplement le serveur. Vérification :

```bash
claude mcp list
```

Alternative officielle, qui installe le serveur MCP et les skills 21st ensemble,
à taper dans Claude Code :

```
/plugin marketplace add 21st-dev/claude-code-plugin
/plugin install 21st@21st
```

## Chaîne d'envoi du devis

Le formulaire se remplit en deux étapes — coordonnées, puis projet — avec une
barre de progression et une validation par étape.

À l'envoi, `server/devis.js` :

1. ignore silencieusement les soumissions du pot de miel ;
2. limite le débit par adresse IP (5 envois / 10 minutes) ;
3. vérifie le jeton Turnstile si la clé secrète est configurée ;
4. revalide **tous** les champs côté serveur — la validation navigateur ne
   protège de rien ; les erreurs reviennent en 422 et sont réaffichées sous le
   champ concerné, en revenant à la bonne étape ;
5. envoie la demande à l'équipe (`reply_to` = le prospect, pour répondre d'un
   clic) ;
6. envoie un **accusé de réception au prospect** avec le récapitulatif —
   uniquement si Turnstile a confirmé un humain, sans quoi le formulaire
   servirait de relais à spam depuis votre domaine ;
7. redirige vers `merci.html`, qui n'annonce l'accusé que s'il est réellement
   parti.

Le formulaire accepte une **pièce jointe facultative** (cahier des charges) :
PDF, Word, PowerPoint ou Excel, 3 Mo maximum — au-delà, le corps encodé dépasse
la limite de charge utile des fonctions serverless. Le serveur revérifie
l'extension, la validité du base64 et la taille réelle, et réduit le nom au nom
de base pour qu'il ne puisse traverser aucun répertoire. La pièce n'accompagne
que l'e-mail interne : le prospect a déjà son fichier.

Les valeurs sont échappées avant insertion dans le HTML des e-mails et les
retours à la ligne sont retirés des en-têtes : ni injection de balise, ni
injection d'en-tête SMTP.

Si la fonction est injoignable (site publié sans backend, panne du service), le
formulaire ouvre la messagerie du visiteur avec la demande pré-remplie plutôt
que de perdre le contact.

## Section Réalisations

Six études de cas au format contexte → dispositif → résultat chiffré.

**Les visuels ne sont pas des photographies.** Ce sont des scènes géométriques
abstraites générées en SVG, dans le vocabulaire graphique du site : salle en
perspective, faisceaux, tables rondes, réseau de nœuds, carte de tournée. Elles
illustrent un type d'événement sans jamais prétendre montrer une prestation
réelle. Chacune pèse entre 3 et 11 Ko, se charge en différé et porte ses
dimensions, donc aucun décalage de mise en page à l'affichage.

Pour les régénérer après modification (couleurs, composition, ajout d'une scène) :

```bash
python3 tools/generer-visuels-realisations.py
```

> **Contenu d'exemple.** Les six missions et tous leurs chiffres sont fictifs :
> ils servent de gabarit. Remplacez-les par vos missions réelles — et par vos
> photos si vous en avez — avant toute mise en ligne. Un commentaire le rappelle
> en tête de la section dans `index.html`.

## Référencement

- **Une page par pack** dans `packs/`, avec son contenu, sa FAQ et son balisage
  `Service` + `BreadcrumbList` + `FAQPage`. Une page unique ne se positionne pas
  sur « organisation séminaire entreprise Lyon » ; six pages, si.
- **Balisage de l'accueil** : `ProfessionalService`, `WebSite`, `OfferCatalog` et
  `FAQPage` — les questions deviennent éligibles à l'affichage enrichi Google.
- **`sitemap.xml` et `robots.txt`** générés, `merci.html` et `/api/` exclus.
- **Canonical, Open Graph et Twitter Card** sur toutes les pages.
- **`og-cover.png` 1200 × 630** : sans image bitmap, chaque partage sur LinkedIn
  produisait une carte vide — aucun réseau social n'affiche un SVG en aperçu.

Le domaine est défini une seule fois, en tête de `tools/appliquer-meta.py` et de
`tools/generer-pages-packs.py` (`SITE = "https://www.edb-evenement.fr"`).
Après modification :

```bash
python3 tools/generer-pages-packs.py   # pages, sitemap, robots
python3 tools/appliquer-meta.py        # canonical, OG, icônes
node tools/generer-images.mjs          # og-cover.png et favicons
```

## Les quatre packs

L'offre compte **quatre packs**, décrits une seule fois dans
`tools/generer-pages-packs.py` :

| Pack | Statut | Page dédiée | Commandable |
|---|---|---|---|
| Pack Essentiel | disponible | oui | oui |
| Pack Sur-mesure | disponible | oui | oui |
| Pack Premium | en préparation | non | non |
| Pack Prestige | en préparation | non | non |

Cette liste fait autorité. `python3 tools/generer-pages-packs.py` régénère à
partir d'elle : la section de la page d'accueil (entre les marqueurs
`<!-- PACKS:DEBUT -->` et `<!-- PACKS:FIN -->`), les pages dédiées, le sitemap —
et **supprime les pages des packs retirés de l'offre**.

Trois endroits restent à aligner à la main si vous ajoutez un pack commandable :
les options du `<select id="f-pack">` dans `index.html`, la liste `PACKS` de
`server/devis.js` (qui refuse toute autre valeur), et `SLUGS` dans
`assets/js/main.js`.

> **À compléter.** Le périmètre et le tarif du Pack Premium et du Pack Prestige
> restent à définir, et les deux packs disponibles affichent « Sur devis » plutôt
> qu'un tarif de départ inventé.

## Bandeau d'annonce

Fixé tout en haut de chaque page, avec un **compte à rebours à la seconde**
jusqu'à l'ouverture : jours, heures, minutes, secondes.

La date se règle dans `CONFIG.OUVERTURE` (`assets/js/main.js`), au format
`AAAA-MM-JJ` ou `AAAA-MM-JJTHH:MM`. Elle doit être **fixe** : une échéance
recalculée à chaque visite ne décroîtrait jamais.

> **Date provisoire.** `2028-09-01T09:00` est un repère à deux ans, pas une vraie
> date d'ouverture. À remplacer.

Quelques partis pris :

- **Les chiffres ont une largeur figée** (`min-width: 2ch`, chiffres tabulaires) :
  sans cela, le passage de `10` à `9` décale ses voisins et le bandeau tressaute
  une fois par seconde.
- **Le décompte est masqué aux lecteurs d'écran** (`aria-hidden`), qui reçoivent
  la date en clair juste à côté. Faire annoncer un compteur chaque seconde rendrait
  la page inutilisable.
- **`prefers-reduced-motion`** retire les secondes et passe le rafraîchissement à
  la minute.
- Le décompte **s'arrête dans un onglet masqué**, et sous 420 px les secondes
  disparaissent pour ne pas imposer une seconde ligne.
- À échéance, le décompte disparaît et le libellé devient « L'entreprise est
  ouverte ».

Sa hauteur est mesurée puis publiée dans la variable CSS `--annonce-h` : l'en-tête
fixe, les ancres internes et le hero s'en servent pour se décaler, quel que soit
le repli du texte sur mobile.

## Billetterie

Vente de billets en ligne, paiement par **Stripe Checkout** : la page de paiement
est hébergée par Stripe, aucune donnée de carte ne transite par ce site.

### Le chemin d'une commande

1. `billetterie.html` charge le catalogue depuis `/api/billetterie`.
2. Le visiteur choisit ses billets. **Le navigateur n'envoie que des
   identifiants et des quantités** : un panier arrivant avec « prix : 1 centime »
   serait simplement ignoré, le serveur recalcule tout depuis
   `data/billetterie.json`.
3. `/api/paiement` vérifie le panier, contrôle le quota, crée la session Stripe
   et renvoie l'URL de paiement.
4. Stripe encaisse, puis appelle `/api/stripe-webhook`. **C'est là, et nulle part
   ailleurs, que les billets sont émis** : rien de ce qui vient du navigateur ne
   prouve un paiement, et un acheteur peut fermer l'onglet avant le retour.
5. La signature de chaque webhook est vérifiée avant toute action, avec une
   tolérance de cinq minutes contre le rejeu. Sans cela, n'importe qui pourrait
   poster un faux « paiement réussi » et se faire émettre des billets.
6. Les billets partent par e-mail, avec un QR code par billet en pièce jointe,
   et une copie interne à l'agence.

### Les codes de billets

Aucun billet n'est stocké : le code porte sa propre preuve. Il est signé en
HMAC-SHA256 avec `BILLET_SECRET`, donc impossible à fabriquer sans la clé et
vérifiable hors ligne. Format :
`EDB-<événement>-<commande>-<n°>-<signature>`.

La comparaison des signatures est faite en temps constant : un `===` laisserait
fuir, par le temps de réponse, le nombre de caractères déjà corrects.

### Contrôle d'accès — la limite à connaître

`verifier-billet.html` prouve qu'un billet est **authentique**. Il ne prouve pas
qu'il n'a **pas déjà servi** : interdire le second passage demande un état
partagé entre les points de contrôle, donc un stockage. Trois options, par ordre
d'effort :

- tenir la liste des codes admis sur place (suffisant en dessous de 200 entrées) ;
- brancher un magasin clé-valeur (Netlify Blobs, Vercel KV, Upstash) et marquer
  chaque code au premier scan — une trentaine de lignes dans `server/billets.js` ;
- passer à une vraie base si vous vendez régulièrement.

Le quota souffre de la même limite : il est contrôlé juste avant paiement en
comptant les sessions Stripe déjà payées, mais ce n'est pas une réservation.
Deux acheteurs simultanés sur la dernière place peuvent tous deux passer — le
remboursement reste possible.

### Essayer la billetterie

Deux niveaux, du plus rapide au plus complet.

**1. Banc d'essai hors ligne — aucune clé requise**

```bash
npm run tester-billetterie
```

Rejoue toute la chaîne avec Stripe et Resend simulés : catalogue, panier,
paiement, webhook signé, émission, contrôle d'accès. Trente contrôles, dont les
tentatives qui *doivent* échouer — prix truqué par le navigateur, quantité
fractionnaire, signature falsifiée ou périmée. Il affiche à la fin un **code de
billet valide** à coller dans `verifier-billet.html`.

C'est ce banc d'essai qui a déjà attrapé une quantité de `1.5` silencieusement
ramenée à `1` par `parseInt`.

Il tourne aussi en intégration continue, à chaque push.

**2. Avec le vrai Stripe, en mode test**

1. `STRIPE_SECRET_KEY` = votre clé `sk_test_…`, `SITE_URL` = l'URL du site.
2. Webhook de test vers `/api/stripe-webhook`, événement
   `checkout.session.completed` → `STRIPE_WEBHOOK_SECRET`.
   En local : `stripe listen --forward-to localhost:8888/api/stripe-webhook`.
3. Réservez sur `billetterie.html` et payez avec la carte de test
   **4242 4242 4242 4242**, n'importe quelle date future, n'importe quel CVC.
4. Vous devez recevoir les billets par e-mail, et le code doit être accepté par
   `verifier-billet.html`.

Aucun euro n'est débité en mode test, et les commandes restent visibles dans le
tableau de bord Stripe.

### Mise en service

1. Compte Stripe, puis `STRIPE_SECRET_KEY` (commencez en `sk_test_…`).
2. Webhook sur `https://votre-domaine/api/stripe-webhook`, événement
   `checkout.session.completed` → `STRIPE_WEBHOOK_SECRET`.
3. `BILLET_SECRET` : 32 caractères aléatoires (`openssl rand -base64 32`).
   **La changer invalide tous les billets déjà émis.**
4. `SITE_URL` pour les URL de retour après paiement.
5. Remplacer les événements de `data/billetterie.json` par les vrais.
6. Faire relire `cgv.html` par un juriste avant d'ouvrir la vente.

Sans `STRIPE_SECRET_KEY`, la page s'affiche et explique que la billetterie n'est
pas encore ouverte, en invitant à écrire à l'agence : aucun visiteur ne tombe
sur une erreur brute.

## Contrôle qualité automatisé

`node tools/audit.mjs` rejoue, sur les onze pages, les vérifications qui sinon se
perdraient : contrastes WCAG AA sur le rendu réel, cibles tactiles de 44 px
(avec l'exception « inline » de WCAG 2.5.8), absence de débordement horizontal en
375, 768, 1024 et 1440 px, liens internes morts, images sans `alt` ni dimensions,
erreurs JavaScript et validité du JSON-LD. Sortie non nulle au moindre écart.

Le workflow `.github/workflows/qualite.yml` l'exécute à chaque push et pull
request, avec en plus : vérification syntaxique des scripts, détection de clé
secrète committée, contrôle que les pages générées sont à jour, et un budget
Lighthouse (`.github/budget-lighthouse.json`) qui interdit notamment toute
ressource tierce.

## Mesure d'audience et prise de rendez-vous

Deux réglages dans `CONFIG`, en tête de `assets/js/main.js`, vides par défaut :

| Clé | Effet |
|---|---|
| `ANALYTICS_DOMAIN` | charge Plausible et compte l'objectif « Devis envoyé » avec le pack choisi |
| `RDV_URL` | affiche un bouton « Réserver un créneau » à côté du formulaire |

Plausible ne dépose **aucun cookie** : pas de bandeau de consentement, et la
politique de confidentialité reste exacte telle qu'elle est écrite. Google
Analytics imposerait l'un et la réécriture de l'autre.

## Accessibilité

- Contrastes conformes WCAG AA sur les quatre pages, vérifiés sur le rendu réel.
  Le rouge est décliné en trois valeurs : `--rouge` pour les aplats,
  `--rouge-clair` pour les gros titres (seuil 3:1), `--rouge-texte` (#ef4a60,
  5,15:1) dès qu'il porte du texte courant.
- Cibles tactiles de 44 × 44 px minimum sur écran tactile, vérifiées par l'audit.
- Chaque champ est relié à son message d'erreur par `aria-describedby`, et
  l'emplacement du message est réservé en permanence : une erreur qui apparaît
  ou disparaît ne décale plus la mise en page — sans cela, un clic sur
  « Continuer » pouvait être perdu entre le mousedown et le mouseup.
- Statut du formulaire annoncé via `role="status"`, navigation clavier complète,
  lien d'évitement, respect de `prefers-reduced-motion`.

## Performance et sobriété

Relevés Lighthouse (mobile, réseau et processeur bridés), sur les pages
mesurées par l'intégration continue :

| Page | Score | LCP | TBT | CLS |
|------|-------|-----|-----|-----|
| `index.html` | 99 | 2,0 s | 70 ms | 0 |
| `packs/essentiel.html` | 99 | 2,0 s | 20 ms | 0 |
| `packs/sur-mesure.html` | 99 | 2,0 s | 0 ms | 0 |
| `billetterie.html` | 99 | 2,0 s | 0 ms | 0 |

- **Inter auto-hébergé** en un seul fichier variable de 48 Ko : aucune requête
  vers Google Fonts, donc aucune adresse IP transmise à un tiers — un point
  regardé de près côté RGPD.
- **Animations mises en pause hors de l'écran** (`IntersectionObserver`) et
  quand l'onglet passe en arrière-plan : les vignettes de packs ne consomment
  plus de CPU quand personne ne les regarde.
- **Hauteur du bandeau d'annonce fixée dans la feuille de style.** Elle était
  auparavant mesurée en JavaScript puis réécrite dans une variable CSS sur la
  racine, ce qui invalidait le style de tout le document ; sept règles `:has()`
  posées sur `html`/`body` rendaient chaque recalcul très coûteux, et un
  `ResizeObserver` relançait le cycle. À elles deux, ces lignes représentaient
  l'essentiel du temps de blocage : 340 ms de TBT et un indice de vitesse de
  3,9 s, contre 70 ms et 1,2 s aujourd'hui.
- **Place réservée au catalogue de la billetterie** pendant son chargement :
  sans cela, l'arrivée des cartes repoussait la FAQ d'un coup (CLS 0,074).
- En-têtes de cache et de sécurité fournis pour les deux plateformes.

Le budget de `.github/budget-lighthouse.json` est calé sur des poids **non
compressés** — c'est ce que sert `http-server` en intégration continue, alors
que Netlify et Vercel servent tout en gzip. Il est donc volontairement sévère.

## Animations des packs

| Pack | Animation |
|------|-----------|
| Essentiel | plan de salle en perspective balayé par une lumière de scène |
| Sur-mesure | rubis à facettes avec point en orbite |
| Premium | motif d'attente, sablier lent |
| Prestige | horizon qui se dessine, scène « à venir » |

Tout est en CSS/SVG, en cycles lents de 6 à 9 s, en monochrome rouge.

## Sécurité

Ce qui est en place :

- **Aucun secret dans le dépôt.** Toutes les clés passent par des variables
  d'environnement (`.env.example` en donne la liste, sans valeurs). L'intégration
  continue échoue si un motif de clé Resend, Stripe ou 21st apparaît dans le code.
- **Dépendances figées** par `package-lock.json` (`npm audit` : 0 vulnérabilité).
- **En-têtes** sur les deux plateformes : CSP stricte sans `unsafe-inline`,
  HSTS deux ans avec sous-domaines, `nosniff`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`. `third-party` est budgété à 0 octet.
- **Devis** : anti-robot Turnstile, pot de miel, limite de débit, pièces jointes
  filtrées par extension et par taille, en-têtes d'e-mail nettoyés de tout
  retour chariot. L'accusé de réception n'est envoyé **que** si Turnstile
  confirme un humain — sans cette condition, le formulaire servait de relais à
  courrier indésirable, expédié depuis un domaine vérifié.
- **Paiement** : les prix sont recalculés côté serveur à partir de
  `data/billetterie.json`, jamais lus dans la requête. Les quantités sont
  validées en entier strict. Le navigateur ne prouve aucun paiement : les
  billets ne sont émis que par le webhook, dont la signature est vérifiée
  (HMAC-SHA256, tolérance de 5 minutes) avant toute action.
- **Billets** signés en HMAC-SHA256 et comparés en temps constant
  (`crypto.timingSafeEqual`).
- **URL de retour Stripe** issues de `SITE_URL`. L'en-tête `Host`, que
  n'importe qui peut forger, ne sert que de secours en développement et le
  serveur le signale dans ses journaux.

Limites assumées, à connaître avant d'ouvrir la billetterie au public :

- **La limite de débit est en mémoire.** Sur des fonctions serverless, chaque
  instance a la sienne : elle freine un robot isolé, pas une attaque répartie.
  Un magasin partagé (Upstash, Redis) serait nécessaire pour cela.
- **Un billet valide n'est pas un billet non utilisé.** La signature prouve
  l'authenticité, pas l'unicité du passage ; détecter un second scan demande un
  état partagé.
- **Le webhook n'est pas dédupliqué**, mais il est idempotent : la référence de
  commande dérive de l'identifiant de session, donc un événement rejoué réémet
  les mêmes codes et renvoie le même e-mail — il ne crée pas de billets
  supplémentaires.
- **`tools/serveur-local.mjs` contient un écran de paiement simulé.** Ce fichier
  est un outil de développement, il n'est jamais déployé : ni `netlify.toml` ni
  `vercel.json` n'y font référence, et rien dans `api/` ou `netlify/functions/`
  ne l'importe.

## À personnaliser avant mise en ligne

1. **Mentions légales et politique de confidentialité** : toutes les mentions
   entre crochets. Elles sont obligatoires et engagent votre responsabilité.
2. **Logos clients** du bandeau « Ils nous font confiance » — les six noms
   actuels sont fictifs.
3. **Témoignages** : les trois citations sont des exemples.
4. **Billetterie** : les trois événements de `data/billetterie.json`, leurs dates
   et leurs tarifs sont fictifs. Les conditions de vente doivent être relues par
   un juriste.
5. **Packs** : définir le périmètre du Pack Premium et du Pack Prestige, et fixer
   un tarif de départ pour l'Essentiel et le Sur-mesure si vous en voulez un
   affiché.
6. **Bandeau d'annonce** : remplacer la date provisoire `2028-09-01T09:00` par
   la vraie date d'ouverture dans `CONFIG.OUVERTURE`.
7. **Réalisations** : les six études de cas et leurs chiffres sont fictifs. Les
   scènes SVG peuvent rester telles quelles, ou céder la place à vos photos
   (prévoir AVIF/WebP, `loading="lazy"` et dimensions explicites).
8. Chiffres clés du hero, tarifs de départ des packs, contenu de la FAQ.
9. Adresse, téléphone, e-mail (`index.html`, pages annexes et
   `CONFIG.CONTACT_EMAIL` dans `assets/js/main.js`), et le domaine
   `edb-evenement.fr` employé dans les URL canoniques et `SITE_URL`.
