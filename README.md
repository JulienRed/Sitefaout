# RUBIS Événements — site vitrine

Site vitrine statique pour une agence événementielle. Thème noir & rouge rubis,
logo rubis en SVG, cinq packs d'offres avec une animation propre à chacun,
et un formulaire de devis envoyé par e-mail.

## Contenu

```
index.html            page unique (hero, expertises, packs, méthode, avis, devis, footer)
assets/css/styles.css thème noir & rouge, animations, responsive
assets/js/main.js     animations au scroll, compteurs, menu, formulaire de devis
assets/img/logo.svg   logo rubis (également utilisé comme favicon)
```

Aucune dépendance, aucun build : ouvrez `index.html` ou servez le dossier.

```bash
npx http-server -p 8080 .
```

## Les cinq packs et leurs animations

| Pack | Animation |
|------|-----------|
| Corporate | faisceau de poursuite balayant une grille en perspective + barres de scène |
| Mariage | pétales qui tombent et deux anneaux entrelacés qui pulsent |
| Soirée & Clubbing | égaliseur audio 12 bandes + stroboscope |
| Privé | explosion de confettis en boucle |
| Sur-mesure | rubis à facettes scintillant avec une particule en orbite |

Les cartes réagissent aussi au survol (relief 3D, halo rouge, puces qui pivotent).
Tout est désactivé si le visiteur a activé « réduire les animations »
(`prefers-reduced-motion`).

## ⚙️ Configurer l'envoi du devis par mail

Un site statique ne peut pas envoyer d'e-mail par lui-même : il faut un service
qui relaie le formulaire vers la boîte de réception. Tout se règle en haut de
`assets/js/main.js` :

```js
var CONFIG = {
  FORM_ENDPOINT: '',                            // ← l'URL de votre service de formulaire
  CONTACT_EMAIL: 'contact@rubis-evenements.fr'  // ← la boîte qui reçoit les devis
};
```

### 1. Mode automatique (recommandé)

1. Créez un formulaire gratuit sur [Formspree](https://formspree.io) ou
   [Web3Forms](https://web3forms.com) avec l'adresse de réception souhaitée.
2. Collez l'URL d'envoi obtenue dans `FORM_ENDPOINT`
   (ex. `https://formspree.io/f/xxxxxxxx`).

La demande part alors en arrière-plan et le visiteur voit un message de
confirmation sans quitter la page. L'e-mail reçu contient chaque champ
séparément, plus un récapitulatif prêt à lire.

### 2. Mode repli (par défaut)

Tant que `FORM_ENDPOINT` est vide — ou si le service est injoignable — le
formulaire ouvre le logiciel de messagerie du visiteur avec un message
pré-rempli adressé à `CONTACT_EMAIL`. Le site est donc fonctionnel dès
l'ouverture, sans aucune configuration.

## Formulaire de devis

- Champs : nom, e-mail, téléphone, société, pack, date, nombre d'invités, ville,
  budget, description du projet, consentement RGPD.
- Les boutons « Ce pack m'intéresse » font défiler jusqu'au formulaire et
  présélectionnent le pack concerné.
- Validation en français côté navigateur, message d'erreur sous chaque champ.
- Champ pot-de-miel caché (`site_web`) contre les robots spammeurs.

## À personnaliser avant mise en ligne

- Nom de l'agence, adresse, téléphone et e-mail (`index.html` + `main.js`).
- Tarifs et contenu des packs.
- Témoignages clients et chiffres clés du hero.
- SIRET et mentions légales du pied de page.
