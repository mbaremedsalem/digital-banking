# PoolPay — Digital Banking

API bancaire Django REST + frontend React.

- **Backend** : Django 5 / DRF / JWT — virements, demandes de paiement, cartes,
  retrait d'espèces au guichet, paiement de services partenaires (Agharina).
- **Frontend** : React + Vite, dans [`frontend/`](frontend/) (voir son propre README).

---

## Développement local

```bash
# 1. Environnement Python
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash
# source .venv/bin/activate        # macOS / Linux
pip install -r requirements.txt

# 2. Configuration
cp .env.example .env               # puis éditez les valeurs

# 3. Base de données locale (SQLite)
python manage.py migrate
python manage.py createsuperuser
python manage.py creer_comptes_service   # comptes Agharina + caisse banque

# 4. Lancement
python manage.py runserver
```

Le frontend se lance à part :

```bash
cd frontend && npm install && npm run dev
```

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `DJANGO_SECRET_KEY` | clé de signature Django | clé de dev (à remplacer en prod) |
| `DJANGO_DEBUG` | mode debug | `True` en local, `False` sur Render |
| `DJANGO_ALLOWED_HOSTS` | hôtes autorisés (séparés par des virgules) | `localhost,127.0.0.1,.onrender.com` |
| `DATABASE_URL` | connexion PostgreSQL | absent ⇒ SQLite locale |
| `CORS_ALLOWED_ORIGINS` | origines autorisées du frontend | fronts locaux Vite |
| `CSRF_TRUSTED_ORIGINS` | origines de confiance CSRF | fronts locaux Vite |
| `SERVE_LEGACY_SITE` | sert l'ancien site HTML (accueil, connexion, dashboard) | `True` en local, `False` en production |
| `AGHARINA_API_URL` | API immobilière partenaire | `https://admin-akarina.akarina.shop/api/biens` |
| `SERVICE_TAX_RATE` | taxe de service | `0.02` (2 %) |
| `AGHARINA_ACCOUNT_NUMBER` | compte recevant le prix des biens | — |
| `POOLPAY_BANK_ACCOUNT_NUMBER` | compte recevant la taxe | — |

Modèle complet dans [`.env.example`](.env.example).

---

## Déploiement sur Render

Le dépôt contient un blueprint [`render.yaml`](render.yaml) qui crée d'un coup le
service web et la base PostgreSQL.

### Méthode 1 — Blueprint (recommandée)

1. Render Dashboard → **New** → **Blueprint**.
2. Sélectionner ce dépôt : `render.yaml` est détecté automatiquement.
3. Render crée `poolpay-db` (PostgreSQL) et `poolpay-api` (web), et génère
   `DJANGO_SECRET_KEY` tout seul.
4. Après le premier déploiement, ouvrir le **Shell** du service :

   ```bash
   python manage.py creer_comptes_service
   python manage.py createsuperuser
   ```

5. Reporter les deux numéros de compte affichés dans
   `AGHARINA_ACCOUNT_NUMBER` et `POOLPAY_BANK_ACCOUNT_NUMBER`
   (Environment → Environment Variables), puis redéployer.
6. Mettre `CORS_ALLOWED_ORIGINS` et `CSRF_TRUSTED_ORIGINS` à l'URL réelle du
   frontend une fois celui-ci en ligne.

### Méthode 2 — Service manuel

| Réglage | Valeur |
|---|---|
| Runtime | Python 3 |
| Build Command | `./build.sh` |
| Start Command | `gunicorn project.wsgi:application --log-file - --timeout 120` |
| Health Check Path | `/api/schema/` |

Ajouter ensuite une base PostgreSQL Render et lier sa `DATABASE_URL` au service,
puis renseigner les variables du tableau ci-dessus.

> **Attention** : un service créé manuellement **ignore `render.yaml`**. Si le
> Start Command est laissé vide, Render devine `gunicorn app:app` et le
> déploiement échoue avec `ModuleNotFoundError: No module named 'app'`. De même,
> si le Build Command n'est pas `./build.sh`, ni `collectstatic` ni `migrate` ne
> sont exécutés et la base reste vide. Ces deux champs se trouvent dans
> **Settings → Build & Deploy**.

### Ce que fait `build.sh`

```bash
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input
```

Les fichiers statiques sont servis par **WhiteNoise** — aucun service externe requis.

### Pages HTML et filtres anti-hameçonnage

En production, `SERVE_LEGACY_SITE` vaut `False` : l'ancien site HTML (page
d'accueil marketing, `/user/sign-in/`, `/account/dashboard/`, formulaires de
virement et de carte) n'est **pas** servi, et la racine affiche une page
technique sobre listant l'API et l'admin.

C'est délibéré. Une page d'accueil promettant des transferts d'argent, assortie
de formulaires de mot de passe, de carte bancaire et de code PIN, hébergée sur un
sous-domaine gratuit sans réputation, correspond exactement au profil qu'un
navigateur classe comme site d'hameçonnage — Chrome affiche alors
« Dangerous site » et bloque l'accès.

L'interface destinée aux clients est le frontend React. L'administration Django
(`/admin/`) et l'ensemble des endpoints REST restent évidemment accessibles.

Pour réactiver l'ancien site malgré tout : `SERVE_LEGACY_SITE=True`.

### Points d'attention

- **Le disque Render est éphémère** : les fichiers téléversés dans `media/`
  (photos KYC, signatures) sont perdus à chaque déploiement. Pour les conserver,
  brancher un stockage objet (S3, Cloudinary) ou un disque persistant Render.
- **Le plan gratuit met le service en veille** après 15 minutes d'inactivité :
  la première requête suivante peut prendre ~30 secondes.
- **`certifi` est indispensable** : sans lui, les appels HTTPS sortants vers l'API
  Agharina échouent en `certificate verify failed` sur certaines plateformes.

---

## Structure

```
project/        configuration Django (settings pilotés par l'environnement)
userauths/      utilisateur personnalisé, JWT, profil, mot de passe
account/        compte bancaire, KYC
core/           virements, demandes de paiement, cartes,
                withdrawal.py (retrait au guichet),
                services.py (paiement Agharina)
frontend/       application React (Vite)
```

## Documentation de l'API

- Swagger UI : `/api/schema/swagger-ui/`
- ReDoc : `/api/schema/redoc/`
- Schéma OpenAPI : `/api/schema/`

La liste complète des endpoints et leur usage côté client sont documentés dans
[`frontend/README.md`](frontend/README.md).
