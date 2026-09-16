# PoolPay — Frontend React (Digital Banking)

Interface React (Vite) branchée sur l'API Django REST du projet `digital-banking`.
Tous les endpoints exposés par le backend sont consommés.

## Démarrage

```bash
# 1. Backend (à la racine du projet)
python manage.py runserver

# 2. Frontend
cd frontend
npm install
npm run dev
```

L'URL de l'API se configure dans `.env` :

```
VITE_API_URL=http://127.0.0.1:8000
```

Build de production : `npm run build` (sortie dans `dist/`), prévisualisation : `npm run preview`.

## Déploiement sur Vercel

Le dossier contient un [`vercel.json`](vercel.json) : il réécrit toutes les URL
vers `index.html` (sans quoi rafraîchir `/transactions` renvoie **404 NOT_FOUND**,
Vercel cherchant un fichier à ce chemin) et pose les en-têtes de cache.

### Réglages du projet Vercel

| Réglage | Valeur |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### URL du backend

Elle est fixée dans [`.env.production`](.env.production), **versionné
volontairement** : les variables `VITE_*` sont compilées dans le bundle au
moment du build, et `.env` n'étant pas versionné, Vercel ne le voit pas. Sans ce
fichier, l'application déployée appellerait `http://127.0.0.1:8000`.

```
VITE_API_URL=https://digital-banking-3.onrender.com
```

Ce n'est pas un secret : l'URL est de toute façon visible dans le code compilé.
Pour changer de backend, modifiez ce fichier et redéployez. Une variable
`VITE_API_URL` définie dans le dashboard Vercel reste prioritaire si vous
préférez ce mécanisme.

### Autoriser Vercel côté backend

Le navigateur bloque les appels tant que le backend ne renvoie pas l'en-tête
CORS correspondant. `https://frontend-digital-banking.vercel.app` est déjà autorisé par défaut dans
`project/settings.py`, ainsi que les déploiements de prévisualisation du même
projet (`frontend-digital-banking-*.vercel.app`) — aucune variable à définir sur
Render.

Pour un autre domaine, surchargez par l'environnement :

```
CORS_ALLOWED_ORIGINS        = https://votre-app.vercel.app
CSRF_TRUSTED_ORIGINS        = https://votre-app.vercel.app
CORS_ALLOWED_ORIGIN_REGEXES = ^https://votre-app-.*[.]vercel[.]app$
```

Attention : ces variables **remplacent** la liste par défaut, elles ne s'y
ajoutent pas.

---

## Architecture

```
src/
  api/
    client.js        client fetch : JWT, refresh auto du token, erreurs DRF normalisées
    endpoints.js     catalogue de TOUS les endpoints backend
  context/
    AuthContext.jsx  profil, compte, notifications, login/register/logout
    ThemeContext.jsx thème clair/sombre persisté
    ToastContext.jsx notifications visuelles
  components/        Layout (sidebar + topbar + barre mobile), UI partagée, PinInput, Stepper…
  pages/             une page par écran (voir routes ci-dessous)
  styles/global.css  design system (variables CSS, thème sombre, responsive)
```

### Authentification

L'access token JWT expire au bout de 5 minutes. `client.js` intercepte les 401,
appelle `/user/token/refresh/` une seule fois (même si plusieurs requêtes échouent
en parallèle), puis rejoue la requête. Si le refresh échoue, la session est purgée
et l'utilisateur revient sur `/login`.

## Routes et endpoints consommés

| Écran | Route | Endpoints |
|---|---|---|
| Connexion | `/login` | `POST /user/login/` |
| Inscription | `/register` | `POST /user/register/` |
| Tableau de bord | `/` | `GET /user/me/`, `GET /transactions-api/`, `GET /all-cards-api/` |
| Transfert — bénéficiaire | `/transfer` | `POST /search-account-api/` |
| Transfert — montant | `/transfer/:acct` | `GET /amount-transfer-api/`, `POST /amount-transfer-process-api/` |
| Transfert — confirmation | `/transfer/:acct/:tx/confirm` | `GET /transfer-confirmation-api/`, `POST /transfer-process-api/` |
| Transfert — reçu | `/transfer/:acct/:tx/done` | `GET /transfer-completed-api/` |
| Demande — payeur | `/request` | `POST /request-search-account-api/` |
| Demande — montant | `/request/:acct` | `GET /amount-request-api/`, `POST /amount-request-process-api/` |
| Demande — confirmation | `/request/:acct/:tx/confirm` | `GET /amount-request-confirmation-api/`, `POST /amount-request-final-process-api/` |
| Demande — reçu | `/request/:acct/:tx/done` | `GET /request-completed-api/` |
| Demandes reçues/envoyées | `/requests` | `GET /transactions-api/`, `DELETE /delete-payment-request-api/` |
| Règlement d'une demande | `/requests/:acct/:tx/settle` | `GET /settlement-confirmation-api/`, `POST /settlement-processing-api/`, `GET /settlement-completed-api/` |
| Transactions | `/transactions` | `GET /transactions-api/` |
| Détail transaction | `/transactions/:tx` | `GET /transaction-detail-api/` |
| Cartes | `/cards` | `GET /all-cards-api/` |
| Détail carte | `/cards/:cardId` | `GET /card-api/`, `POST /fund-credit-card-api/`, `POST /withdraw-fund-api/`, `DELETE /delete-card-api/` |
| Retrait espèces (client) | `/withdraw` | `GET/POST /withdrawals-api/`, `POST /withdrawal-cancel-api/` |
| Guichet (agent staff) | `/teller` | `GET /withdrawals-pending-api/`, `GET /withdrawal-api/<code>/`, `POST /withdrawal-validate-api/<code>/` |
| Paiement Agharina | `/agharina` | `GET /agharina-biens-api/`, `GET /agharina-bien-api/<ref>/`, `POST /agharina-pay-api/<ref>/`, `GET /service-payments-api/` |
| Profil | `/profile` | `GET /user/me/`, `PATCH /user/me/`, `POST /user/change-password/` |
| Notifications | `/notifications` | `GET /user/me/` |
| Déconnexion | — | `POST /user/logout/` |

## Modifications apportées au backend

Ces changements étaient nécessaires pour qu'un frontend séparé puisse fonctionner :

1. **CORS** — ajout de `django-cors-headers` (`INSTALLED_APPS`, `MIDDLEWARE`,
   `CORS_ALLOWED_ORIGINS`, et tout port localhost autorisé en `DEBUG`).
2. **Refresh JWT** — ajout de `/user/token/refresh/` et `/user/token/verify/`
   (l'access token ne vivait que 5 minutes, sans moyen de le renouveler).
3. **`GET /user/me/`** — nouvel endpoint : utilisateur + compte + KYC + 10 dernières
   notifications. Aucune API ne permettait de connaître l'utilisateur connecté.
4. **`TransactionSerializer`** — ajout de 4 champs en lecture seule
   (`sender_username`, `reciever_username`, `sender_account_number`,
   `reciever_account_number`). Sans eux, impossible d'afficher la contrepartie ni
   de construire l'URL de règlement d'une demande, qui attend un `account_number`.
5. **Correctif `SettlementProcessingApi`** — l'API renvoyait une **500**
   (`RelatedObjectDoesNotExist`) quand le demandeur n'avait pas de dossier KYC,
   alors que l'argent avait déjà été transféré.
6. **Retrait au guichet** — nouveau modèle `WithdrawalRequest` (+ migration), API
   `core/withdrawal.py`, et clé `withdraw_transactions` ajoutée à la réponse de
   `/transactions-api/` (l'historique ne renvoyait que les transferts, les retraits
   n'apparaissaient nulle part).
7. **Profil** — `PATCH /user/me/` et `POST /user/change-password/`.
8. **Paiement de services** — modèle `ServicePayment` (+ migration), API
   `core/services.py`, types de transaction `payment` et `fee`, et clé
   `service_transactions` dans `/transactions-api/`.
9. **`certifi`** ajouté aux dépendances : Python n'avait aucun magasin de CA
   utilisable sur cette machine Windows (`ssl.get_default_verify_paths()` pointe vers
   un fichier inexistant), et tout appel HTTPS vers Agharina échouait en
   « certificate verify failed ». La vérification TLS reste **active**.
10. **Sécurité `AccountSerializer`** — `pin_number` et `red_code` ne sont plus
   renvoyés : `/search-account-api/` exposait le code PIN de n'importe quel compte
   recherché. La vérification du PIN reste faite côté serveur.

## Retrait d'espèces au guichet

1. **Le client** (`/withdraw`) demande un montant : un code unique `WDR########` est
   généré, la demande passe en `pending`. Le solde n'est pas encore débité, mais le
   montant est **réservé** — la somme des demandes en attente ne peut pas dépasser le
   solde disponible. Le client peut annuler une demande tant qu'elle est en attente.
2. **L'agent** (utilisateur `is_staff`, écran `/teller`) saisit le code ou le
   sélectionne dans la liste des demandes en attente. Il voit le client, son compte,
   son solde et le montant à remettre.
3. **Le client saisit son mot de passe** sur l'écran de l'agent. S'il est correct :
   le compte client est débité, le compte de l'agent (caisse de la banque) est
   crédité du même montant, une `Transaction` de type `withdraw` est créée, la
   demande passe en `completed` et deux notifications sont émises.

Le tout est dans une transaction atomique : soit les deux comptes bougent, soit rien.
Une demande déjà traitée ou annulée ne peut plus être validée, et un agent ne peut
pas valider son propre retrait.

Les demandes sont également visibles et filtrables dans l'admin Django
(`core → Withdrawal Requests`).

## Service « Paiement Agharina »

Le client paie un loyer ou l'achat d'un bien immobilier depuis son compte PoolPay.

1. **Catalogue** — le backend relaie l'API publique Agharina
   (`https://admin-akarina.akarina.shop/api/biens/`), avec recherche et filtre
   vente/location. Le client peut aussi ouvrir directement une référence
   (`AGH-APP-110D15E0`).
2. **Détail** — photos, type de bien, vente/location, **prix avec son unité**
   (`35 000 MRU / mois`, `115 000 000 MRU / forfait`), adresse, chambres, salles de
   bain, équipements.
3. **Périodes** — pour une **location**, le client choisit le nombre de mois ; le
   montant est recalculé par le serveur. Une **vente** est toujours réglée en une fois.
4. **Devis** — montant, **taxe de service de 2 %** affichée séparément, et total à
   débiter, avec le solde avant/après.
5. **Paiement** — le client saisit **son mot de passe**. Le backend **réinterroge
   l'API Agharina** pour recalculer le prix : le montant envoyé par le navigateur
   n'est jamais utilisé. Puis, dans une transaction atomique :
   - le compte client est débité du **total** (prix + taxe) ;
   - le **compte Agharina** est crédité du prix du bien ;
   - le **compte banque PoolPay** est crédité de la taxe de 2 % ;
   - deux `Transaction` sont créées (`payment` et `fee`), toutes deux visibles dans
     l'historique du client, plus un `ServicePayment` récapitulatif.

Le client retrouve dans « Mes paiements Agharina » chaque paiement avec le détail
montant / taxe / total, et les cumuls.

### Configuration

Dans `project/settings.py` :

| Réglage | Rôle | Valeur actuelle |
|---|---|---|
| `AGHARINA_API_URL` | API partenaire | `https://admin-akarina.akarina.shop/api/biens` |
| `AGHARINA_ACCOUNT_NUMBER` | compte qui reçoit le prix du bien | `2172328718882` (utilisateur `agharina`) |
| `POOLPAY_BANK_ACCOUNT_NUMBER` | compte qui reçoit la taxe | `2171123705801` (utilisateur `poolpay_bank`) |
| `SERVICE_TAX_RATE` | taux de la taxe | `0.02` (2 %) |

Ces deux comptes de service sont de vrais comptes PoolPay (créés sans mot de passe
utilisable). Chaque réglage est surchargeable par variable d'environnement.

Le modèle `ServicePayment` porte un champ `service` : un second service partenaire
pourra être branché sans nouveau modèle.

## Profil et mot de passe

- `PATCH /user/me/` met à jour le nom d'utilisateur, l'email (unicité vérifiée) et,
  si une fiche KYC existe déjà, ses champs texte (nom complet, téléphone, fax, genre,
  situation familiale, pays, région, ville). La **création** d'une fiche KYC reste
  côté Django : elle exige des pièces jointes (signature, pièce d'identité).
- `POST /user/change-password/` vérifie l'ancien mot de passe, applique les
  validateurs Django (longueur, mot de passe courant, non uniquement numérique) et
  renvoie une **nouvelle paire de tokens** que le frontend enregistre pour rester
  connecté.

## Notes

- Le code PIN (4 chiffres) est généré à la création du compte et visible dans
  l'administration Django (`account → Accounts`).
- Les cartes bancaires se créent depuis l'admin Django (`core → Credit cards`) :
  le backend n'expose pas d'endpoint de création.
- `POST /user/logout/` tente de blacklister le refresh token, mais
  `rest_framework_simplejwt.token_blacklist` n'est pas installé : l'appel échoue
  silencieusement et le frontend purge les tokens locaux dans tous les cas.
