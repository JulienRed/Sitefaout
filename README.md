# RUBIS Événements — site vitrine

Site vitrine pour une agence événementielle **corporate (B2B)** : séminaires,
conventions, lancements produit, soirées de gala, team building. Thème noir &
rouge rubis, registre sobre, formulaire de devis en deux étapes envoyé par e-mail
via une fonction serverless.

## Contenu

```
index.html               page principale (hero, expertises, packs, méthode,
                         engagements, références, FAQ, devis)
merci.html               confirmation après envoi — c'est elle qui rend la
                         conversion mesurable
mentions-legales.html    mentions légales (à compléter)
confidentialite.html     politique de confidentialité (à compléter)

assets/css/styles.css    thème, animations, responsive
assets/js/main.js        étapes du formulaire, envoi, animations, FAQ
assets/fonts/            Inter variable auto-hébergé (SIL OFL)
assets/img/logo.svg      logo rubis, également favicon
assets/img/realisations/ scènes illustratives des études de cas (SVG générés)
tools/                   générateur des scènes de la section Réalisations

server/devis.js          traitement du devis (validation, anti-robot, e-mails)
netlify/functions/       adaptateur Netlify
api/devis.js             adaptateur Vercel
netlify.toml             publication + en-têtes + redirection /api/devis
vercel.json              en-têtes
.env.example             modèle des variables d'environnement
.mcp.json                serveur MCP 21st.dev (clé via variable d'env)
.claude/skills/          bundle de skills design ui-ux-pro-max
```

Aucune dépendance, aucun build. En local :

```bash
npx http-server -p 8080 .
```

Sans fonction serverless, le formulaire bascule automatiquement sur le client
mail du visiteur : le site reste utilisable tel quel.

## Mise en ligne

### Netlify

1. Connectez le dépôt — `netlify.toml` fait le reste (publication à la racine,
   fonctions dans `netlify/functions`, redirection de `/api/devis`).
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

## Accessibilité

- Contrastes conformes WCAG AA sur les quatre pages, vérifiés sur le rendu réel.
  Le rouge est décliné en trois valeurs : `--rouge` pour les aplats,
  `--rouge-clair` pour les gros titres (seuil 3:1), `--rouge-texte` (#ef4a60,
  5,15:1) dès qu'il porte du texte courant.
- Chaque champ est relié à son message d'erreur par `aria-describedby`, et
  l'emplacement du message est réservé en permanence : une erreur qui apparaît
  ou disparaît ne décale plus la mise en page — sans cela, un clic sur
  « Continuer » pouvait être perdu entre le mousedown et le mouseup.
- Statut du formulaire annoncé via `role="status"`, navigation clavier complète,
  lien d'évitement, respect de `prefers-reduced-motion`.

## Performance et sobriété

- **Inter auto-hébergé** en un seul fichier variable de 48 Ko : aucune requête
  vers Google Fonts, donc aucune adresse IP transmise à un tiers — un point
  regardé de près côté RGPD.
- **Animations mises en pause hors de l'écran** (`IntersectionObserver`) et
  quand l'onglet passe en arrière-plan : les six vignettes de packs ne
  consomment plus de CPU quand personne ne les regarde.
- En-têtes de cache et de sécurité fournis pour les deux plateformes.
- Pas encore d'images en dehors du logo : quand vous en ajouterez, prévoyez
  AVIF/WebP, `loading="lazy"` et des dimensions explicites.

## Les six packs et leurs animations

| Pack | Animation |
|------|-----------|
| Séminaire | plan de salle en perspective balayé par une lumière de scène |
| Convention | audience en perspective + arc de scène qui se dessine |
| Lancement produit | ondes concentriques depuis l'objet mis en lumière |
| Soirée de gala | colonnade, table ronde et balayage lumineux lent |
| Team building | réseau de nœuds qui se connectent progressivement |
| Sur-mesure | rubis à facettes avec point en orbite |

Tout est en CSS/SVG, en cycles lents de 6 à 9 s, en monochrome rouge.

## À personnaliser avant mise en ligne

1. **Mentions légales et politique de confidentialité** : toutes les mentions
   entre crochets. Elles sont obligatoires et engagent votre responsabilité.
2. **Logos clients** du bandeau « Ils nous font confiance » — les six noms
   actuels sont fictifs.
3. **Témoignages** : les trois citations sont des exemples.
4. **Réalisations** : les six études de cas et leurs chiffres sont fictifs. Les
   scènes SVG peuvent rester telles quelles, ou céder la place à vos photos
   (prévoir AVIF/WebP, `loading="lazy"` et dimensions explicites).
5. Chiffres clés du hero, tarifs de départ des packs, contenu de la FAQ.
6. Nom de l'agence, adresse, téléphone, e-mail (`index.html`, pages annexes et
   `CONFIG.CONTACT_EMAIL` dans `assets/js/main.js`).
