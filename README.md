# API Bibliothèque : Projet 1 (backend)

API REST de gestion d'une bibliothèque, faite avec **Node.js / Express 5**, **Sequelize (MySQL)**, **JWT**, **Multer** et **express-validator**.
On l'a écrite dans le même style que les exemples du cours : modules ES (`import`/`export`), fonctions fléchées, `async`/`await` avec `try`/`catch`, et une structure modèles / contrôleurs / routes.

---

## 1. Installation et lancement

1. Démarrer **XAMPP** en tant qu'administrateur, puis lancer **MySQL**.
2. Dans phpMyAdmin, créer une base vide nommée `bibliotheque`.
3. Dans le dossier du projet :
   ```bash
   npm install        # installe les modules du package.json
   npm run seed       # crée les tables et ajoute des données de départ
   npm start          # lance le serveur avec nodemon (port 5000)
   ```
4. Ouvrir `http://localhost:5000` : le message « Bienvenue sur l'API de la bibliotheque » doit s'afficher.

> `npm run seed` **supprime et recrée** toutes les tables (`sync({ force: true })`). On l'utilise au début ou pour repartir de zéro.

Comptes créés par le seed (mot de passe : `Password123`) :

| Email | Rôles |
|---|---|
| admin@biblio.ca | admin, membre |
| biblio@biblio.ca | bibliothecaire, membre |
| membre@biblio.ca | membre |

Le fichier `.env` contient la connexion MySQL et la clé secrète `TOKEN_SECRET` du JWT. Il est dans le `.gitignore`, donc il ne va pas sur GitHub. Chaque membre de l'équipe copie `.env.example` en `.env` sur son ordinateur.

---

## 2. Structure du projet

```
projet-bibliotheque/
├── index.js                 # Point d'entrée: middlewares + routes + lancement du serveur
├── seed.js                  # Données de départ
├── .env / .env.example      # Variables d'environnement
├── config/connection.js     # Connexion Sequelize -> MySQL
├── models/                  # (M) Une table = un modèle
│   ├── User.js  Role.js  Categorie.js  Auteur.js  Livre.js  Emprunt.js  Commentaire.js
│   └── relation.js          # Toutes les relations entre les tables
├── controllers/             # (C) Les callbacks des routes (CRUD avec Sequelize)
├── routes/                  # Un Router express par table
├── middlewares/
│   ├── verifierToken.js     # Authentification (JWT)
│   ├── autorise.js          # Autorisation (rôles)
│   ├── upload.js            # Multer (images)
│   └── validationResultat.js# Renvoie les erreurs d'express-validator
├── validations/             # Règles express-validator pour chaque table
├── utils/pagination.js      # Pagination des routes GET
├── uploads/                 # Images envoyées (servies sur /uploads/...)
├── postman/                 # Collection Postman exportée
└── docs/                    # Modèle entité-associations + modèle physique
```

---

## 3. La base de données (7 tables + 1 table intermédiaire)

Voir `docs/modele-entite-association.png` et `docs/modele-physique.png`. Les fichiers `.dot` permettent de régénérer les images.
Le prof demande **Lucidchart** : refaites les deux diagrammes dans Lucidchart en recopiant ces images.

| Table | Champs principaux | Image |
|---|---|---|
| Users | nom, prenom, naissance, email (unique), mdp (haché) | photo |
| Roles | titre (unique) | – |
| RoleUser | UserId, RoleId (table intermédiaire automatique) | – |
| Categories | nom (unique), description | image |
| Auteurs | nom, prenom, nationalite, biographie | photo |
| Livres | titre, isbn (unique), annee, resume, quantite, CategorieId, AuteurId | couverture |
| Emprunts | dateEmprunt, dateRetourPrevue, dateRetour, statut, UserId, LivreId | – |
| Commentaires | note (1 à 5), texte, UserId, LivreId | – |

### Les relations (`models/relation.js`)

| Relation | Type | Code Sequelize | Clé étrangère |
|---|---|---|---|
| Utilisateur ↔ Rôle | plusieurs à plusieurs | `User.belongsToMany(Role, { through: "RoleUser" })` | dans RoleUser |
| Catégorie → Livres | un à plusieurs | `Categorie.hasMany(Livre)` / `Livre.belongsTo(Categorie)` | Livre.CategorieId |
| Auteur → Livres | un à plusieurs | `Auteur.hasMany(Livre)` / `Livre.belongsTo(Auteur)` | Livre.AuteurId |
| Utilisateur → Emprunts | un à plusieurs | `User.hasMany(Emprunt)` | Emprunt.UserId |
| Livre → Emprunts | un à plusieurs | `Livre.hasMany(Emprunt)` | Emprunt.LivreId |
| Utilisateur → Commentaires | un à plusieurs | `User.hasMany(Commentaire)` | Commentaire.UserId |
| Livre → Commentaires | un à plusieurs | `Livre.hasMany(Commentaire)` | Commentaire.LivreId |

Comme vu au chap 4-5, la clé étrangère est portée par la **cible** (celle qui a `belongsTo`).
Les relations créent aussi des méthodes qu'on utilise dans les contrôleurs : `user.getRoles()`, `user.addRole()`, `user.setRoles()`, `categorie.countLivres()`, etc.

---

## 4. Répartition proposée dans l'équipe (exigence : 2 tables minimum par membre)

| Membre | Tables | Fichiers |
|---|---|---|
| Membre 1 | Users + Roles (authentification / autorisation) | `User.js`, `Role.js`, `authController`, `userController`, `roleController`, `verifierToken`, `autorise` |
| Membre 2 | Categories + Auteurs | `Categorie.js`, `Auteur.js` + leurs contrôleurs, routes et validations |
| Membre 3 | Livres + Emprunts | `Livre.js`, `Emprunt.js` + leurs contrôleurs, routes et validations |
| Membre 4 (ou 3 si 3 membres) | Commentaires + pagination / Multer | `Commentaire.js`, `utils/pagination.js`, `middlewares/upload.js` |

---

## 5. Toutes les routes

Légende : 🌐 publique · 🔑 connecté (token) · 👑 admin · 📚 admin ou bibliothécaire

### Authentification `/api/auth`
| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| POST | `/register` | 🌐 | Inscription (form-data + `photo`), rôle « membre » donné automatiquement |
| POST | `/login` | 🌐 | `{ email, mdp }` → renvoie un `token` |
| GET | `/profil` | 🔑 | Infos de l'utilisateur connecté avec ses rôles |

### Utilisateurs `/api/users` (👑)
`GET /` (paginé) · `GET /:id` · `PUT /:id` (form-data + `photo`) · `PUT /:id/roles` `{ "roles": [1,2] }` · `DELETE /:id`

### Rôles `/api/roles` (👑)
`GET /` · `GET /:id` · `POST /` `{ titre }` · `PUT /:id` · `DELETE /:id`

### Catégories `/api/categories`, Auteurs `/api/auteurs`, Livres `/api/livres`
| Méthode | Route | Accès |
|---|---|---|
| GET | `/` (paginé) | 🌐 |
| GET | `/:id` | 🌐 |
| POST | `/` (form-data + image) | 📚 |
| PUT | `/:id` (form-data + image) | 📚 |
| DELETE | `/:id` | 📚 |

Champs image : `image` (catégorie), `photo` (auteur), `couverture` (livre).
Filtres : `/api/auteurs?recherche=hugo` · `/api/livres?recherche=prince&categorieId=2&auteurId=1`

### Emprunts `/api/emprunts` (🔑 pour tout)
| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/mes-emprunts` | 🔑 | Mes emprunts |
| POST | `/` | 🔑 | `{ "LivreId": 1 }` : emprunter (vérifie qu'il reste un exemplaire, retour dans 14 jours par défaut) |
| GET | `/` (paginé, `?statut=en cours`) | 📚 | Tous les emprunts |
| GET | `/:id` | 📚 | Détails |
| PATCH | `/:id/retour` | 📚 | Marquer le livre comme retourné |
| DELETE | `/:id` | 👑 | Supprimer |

### Commentaires `/api/commentaires`
`GET /` (🌐, paginé, `?livreId=2`) · `GET /:id` (🌐) · `POST /` (🔑) · `PUT /:id` (🔑, auteur du commentaire seulement) · `DELETE /:id` (🔑, auteur ou admin)

---

## 6. Comprendre le code (à relire pour apprendre)

### Le chemin d'une requête
Prenons `POST /api/livres` envoyé par un bibliothécaire avec une image :

```
index.js  app.use("/api/livres", livreRoute)
   ↓
routes/livreRoute.js
   .post("/", verifierToken, autorise([...]), upload.single("couverture"), addLivreValidation, validationResultat, addLivre)
       1. verifierToken      -> lit "Authorization: Bearer <token>", le vérifie, met req.userId
       2. autorise           -> cherche les rôles de req.userId (user.getRoles()), sinon 403
       3. upload.single      -> multer sauvegarde l'image dans uploads/ et met req.file + req.body
       4. addLivreValidation -> règles express-validator (titre requis, ISBN valide, la catégorie existe...)
       5. validationResultat -> s'il y a des erreurs: 400 + suppression de l'image
       6. addLivre           -> Livre.create(...) puis 201
```

Chaque middleware appelle `next()` pour passer au suivant, ou renvoie une réponse (`return res.status(...)`) pour arrêter la chaîne. C'est le principe des callbacks multiples vu au chap 3.

> **Pourquoi multer est placé AVANT la validation ?** Avec un formulaire `multipart/form-data`, `req.body` est vide tant que multer n'a pas lu la requête. Si on validait avant, tous les champs seraient « manquants ».

### Authentification (chap 7)
- **Inscription** : `bcrypt.hashSync(mdp, 10)` → le mot de passe n'est jamais stocké en clair.
- **Login** : `bcrypt.compareSync(mdp, user.mdp)` puis `jwt.sign({ id: user.id }, process.env.TOKEN_SECRET, { expiresIn: "1d" })`.
- **verifierToken** : `jwt.verify(token, TOKEN_SECRET, ...)` → met `req.userId`.
- **autorise(["admin"])** : une fonction qui **retourne** un middleware. On peut ainsi choisir les rôles pour chaque route.
- `User.prototype.toJSON` retire `mdp` de toutes les réponses : le mot de passe haché n'est jamais renvoyé au client.

> Petite différence avec les diapos : dans le cours, `verifierToken` met `req.userId` mais `autorise` lit `req.user.id`. Ici les deux utilisent **`req.userId`**, sinon l'autorisation ne marcherait jamais.

### Pagination (`utils/pagination.js`)
`GET /api/livres?page=2&limit=5` donne `offset = (2-1)*5 = 5`. On saute 5 livres et on en prend 5.
On utilise `Model.findAndCountAll({ limit, offset })`, qui renvoie `{ count, rows }`. La réponse a ce format :
```json
{ "data": [ ... ], "pagination": { "total": 12, "page": 2, "limit": 5, "totalPages": 3 } }
```

### Multer (`middlewares/upload.js`)
- `diskStorage` : sauvegarde dans `uploads/` avec un nom unique (`Date.now()-aleatoire.jpg`).
- `fileFilter` : n'accepte que les images. `limits` : 2 Mo maximum.
- En base, on stocke seulement le **nom du fichier**. L'image est visible sur `http://localhost:5000/uploads/<nom>`.
- À la mise à jour ou à la suppression, l'ancienne image est effacée du disque (`supprimerFichier`).

### Validation (express-validator)
- Règles dans `validations/` : `body("nom").trim().notEmpty().withMessage("...")`.
- Pour l'ajout (`addXValidation`), les champs importants sont obligatoires. Pour la mise à jour (`updateXValidation`), tout est `.optional()`.
- Validations personnalisées avec `.custom()` : email déjà utilisé, catégorie ou auteur qui existe vraiment, date de retour dans le futur.
- `validationResultat` renvoie `{ errors: [...] }` avec le code **400**.

### Codes de statut utilisés
200 OK · 201 Créé · 400 Données invalides · 401 Pas authentifié · 403 Rôle insuffisant · 404 Introuvable · 500 Erreur serveur

### Petites corrections par rapport aux exemples du cours
- `findByPk(id)` et non `findByPk({ id })`.
- `unique: true` et non `unique` tout seul (dans `chap4-express-mysql`, ça donnait une erreur).
- `{ through: "RoleUser" }` entre guillemets (une chaîne de caractères).
- Avec **Express 5**, `req.body` vaut `undefined` quand aucun body n'est envoyé, d'où les `req.body || {}` dans les contrôleurs.

---

## 7. Tester avec Postman

1. Dans Postman : **Import**, puis choisir `postman/API-Bibliotheque.postman_collection.json`.
2. Lancer `npm run seed` puis `npm start`.
3. Exécuter **1- Authentification > Login admin**. Le token est sauvegardé automatiquement dans la variable `{{token}}` (script dans l'onglet *Tests*). Toutes les requêtes l'utilisent (Authorization > Bearer Token, hérité de la collection).
4. Pour les requêtes avec image (Body > form-data), choisir un fichier dans le champ de type *File*.
5. Le dossier **9- Tests de sécurité** vérifie les codes 401 (sans token) et 403 (membre qui essaie d'ajouter un livre : faire *Login membre* avant).
6. À la fin : clic droit sur la collection, puis **Export** pour la remettre (5 % de la note).

---

## 8. GitHub (10 % de la note : commits, branches, fusions)

Méthode du cours (chap 1 GitHub) :

```bash
# Le chef d'équipe crée le repo, ajoute les membres + le prof (Settings > Collaborators)
git clone <lien-https-du-repo>
cd <repo>

# Chaque membre travaille sur SA branche
git checkout -b membre1-users-roles
# ... coder ...
git add .
git commit -m "Ajout des modeles User et Role avec la relation belongsToMany"
git push --set-upstream origin membre1-users-roles
# Sur GitHub: Compare & pull request -> Create pull request -> (chef) Merge

# Les autres récupèrent les changements
git checkout main
git pull
git checkout ma-branche
git merge main
```

Ordre de commits suggéré pour avoir un historique propre :
1. `config/connection.js`, `package.json`, `.gitignore`, `.env.example`
2. Les modèles et `relation.js` (une branche par membre)
3. Les contrôleurs et les routes
4. La pagination
5. Les validations et Multer
6. L'authentification et l'autorisation
7. La collection Postman et les diagrammes dans `docs/`

Faites plusieurs petits commits avec des messages clairs plutôt qu'un seul gros commit.
