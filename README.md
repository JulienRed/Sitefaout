# RUBIS Événements — site vitrine

Site vitrine statique pour une agence événementielle **corporate (B2B)** :
séminaires, conventions, lancements produit, soirées de gala, team building.
Thème noir & rouge rubis, registre sobre et institutionnel, formulaire de devis
envoyé par e-mail.

## Contenu

```
index.html            page unique (hero, expertises, packs, méthode,
                      engagements, références, FAQ, devis, footer)
assets/css/styles.css thème noir & rouge, animations, responsive
assets/js/main.js     révélations au scroll, compteurs, menu, FAQ, devis
assets/img/logo.svg   logo rubis (également utilisé comme favicon)
```

Aucune dépendance, aucun build : ouvrez `index.html` ou servez le dossier.

```bash
npx http-server -p 8080 .
```

## Parti pris graphique

Registre corporate : typographie Inter uniquement, titres serrés, filets de 1 px,
aplats sobres, rouge institutionnel (`#c8102e`) utilisé comme accent et non comme
décor. Pas de halos néon ni d'effets clinquants — les animations servent à
qualifier chaque offre, pas à attirer l'œil.

## Les six packs et leurs animations

| Pack | Animation |
|------|-----------|
| Séminaire | plan de salle en perspective balayé par une lumière de scène |
| Convention | audience en perspective + arc de scène qui se dessine |
| Lancement produit | ondes concentriques depuis l'objet mis en lumière |
| Soirée de gala | colonnade, table ronde et balayage lumineux lent |
| Team building | réseau de nœuds qui se connectent progressivement |
| Sur-mesure | rubis à facettes avec point en orbite |

Tout est réalisé en CSS/SVG, en cycles lents (6 à 9 s) et en monochrome rouge.
Les animations sont désactivées si le visiteur a activé « réduire les animations »
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

1. Créez un formulaire sur [Formspree](https://formspree.io) ou
   [Web3Forms](https://web3forms.com) avec l'adresse de réception souhaitée.
2. Collez l'URL d'envoi obtenue dans `FORM_ENDPOINT`
   (ex. `https://formspree.io/f/xxxxxxxx`).

La demande part en arrière-plan et le visiteur voit une confirmation sans quitter
la page. L'e-mail reçu contient chaque champ séparément, plus un récapitulatif
prêt à lire.

### 2. Mode repli (par défaut)

Tant que `FORM_ENDPOINT` est vide — ou si le service est injoignable — le
formulaire ouvre le logiciel de messagerie du visiteur avec un message
pré-rempli adressé à `CONTACT_EMAIL`. Le site est donc fonctionnel dès
l'ouverture, sans configuration.

## Formulaire de devis

- Champs B2B : nom, fonction, société, e-mail professionnel, téléphone, type
  d'événement, date, nombre de participants, ville/région, budget prévisionnel,
  description du projet, consentement RGPD.
- Les boutons « Demander ce pack » font défiler jusqu'au formulaire et
  présélectionnent le type d'événement.
- Validation en français, message d'erreur sous chaque champ.
- Champ pot-de-miel caché (`site_web`) contre les robots spammeurs.

## À personnaliser avant mise en ligne

- **Logos clients** : les six noms du bandeau « Ils nous font confiance »
  (AXENOR, VELTRIS GROUP…) sont fictifs — à remplacer par vos références réelles,
  en texte ou en images.
- **Témoignages** : les trois citations sont des exemples, à remplacer par de
  vrais retours clients (avec leur accord).
- **Chiffres clés** du hero, tarifs de départ des packs, contenu des FAQ.
- Nom de l'agence, adresse, téléphone, e-mail (`index.html` + `main.js`).
- SIRET, TVA, mentions légales et politique de confidentialité du pied de page.
