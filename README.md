# Site Vitroom — vitroom.be

Site de Vitroom (création de sites internet sur mesure), hébergé chez **Hostinger** et publié depuis ce dépôt.

## Organisation

| Dossier / fichier | Rôle |
|---|---|
| `src/pages/*.html` | Contenu de chaque page (à modifier) |
| `src/partials/` | En-tête et pied de page communs |
| `assets/` | CSS, JavaScript, polices, logo, image de partage |
| `api/contact.php` | Réception des formulaires (vérification, anti-spam, envoi par e-mail) |
| `tools/build.py` | Génère les pages `.html` à la racine, `sitemap.xml` et `robots.txt` |
| `.htaccess` | HTTPS forcé, adresses propres, page 404, cache, en-têtes de sécurité |

Après toute modification dans `src/` ou `assets/` : `python3 tools/build.py`, puis commit et push.
Les fichiers `.html` à la racine sont générés : ne pas les modifier à la main.

## Formulaires

Les demandes (devis, questions, diagnostic) partent directement du site vers `api/contact.php`, qui les envoie
par e-mail à sylvainrobinet030308@gmail.com et en garde une copie protégée dans `api/data/` sur le serveur.
Réglages facultatifs (adresse de réception, Turnstile) : copier `api/config.sample.php` en `api/config.php` sur le serveur.

## Test en local

```
php -S localhost:8080 tools/dev-router.php
```
