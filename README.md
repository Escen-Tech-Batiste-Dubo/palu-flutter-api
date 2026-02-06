# 📚 Palu Flutter API

API REST pour la gestion des livres, de l'authentification utilisateur et de bibliothèques numériques personnelles.

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 22+
- MySQL 8.0+
- npm ou yarn

### Configuration

1. **Clonez le projet et installez les dépendances :**
```bash
npm install
```

2. **Créez un fichier `.env` à la racine du projet :**
```env
# Base de données
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=palu

# API Google Books
API_KEY=your_google_books_api_key

# JWT
JWT_SECRET=your_jwt_secret_key

# Configuration
SALT_ROUNDS=10
PORT=3000
```

3. **Démarrez le serveur :**
```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur le port `3000` (configurable via `PORT` dans `.env`).

---

## 🔐 Authentification

Toutes les routes protégées nécessitent un header `Authorization` avec un token JWT :

```
Authorization: Bearer <token>
```

---

## 📋 Endpoints

### 🔑 Authentification (`/auth`)

#### 1. Inscription
```
POST /auth/register
```

**Body :**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123",
  "nickname": "John",
  "bio": "I love reading"
}
```

**Réponse (201) :**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "nickname": "John",
    "bio": "I love reading"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erreurs :**
- `400` : Champs manquants
- `409` : Email ou username déjà utilisé
- `500` : Erreur serveur

---

#### 2. Connexion
```
POST /auth/login
```

**Body :**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

Ou avec le username :
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Validations :**
- Email ou username requis
- Mot de passe requis
- Système de rate limiting : après 3 tentatives échouées, un délai de 5 minutes est appliqué avant la prochaine tentative

**Réponse (200) :**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "nickname": "John",
    "bio": "I love reading",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erreurs :**
- `400` : Champs manquants
- `401` : Identifiants invalides
- `429` : Trop de tentatives échouées, réessayez plus tard
- `500` : Erreur serveur

---

#### 3. Récupérer les informations de l'utilisateur connecté
```
GET /auth/me
Authorization: Bearer <token>
```

**Réponse (200) :**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "nickname": "John",
    "bio": "I love reading",
    "role": "USER"
  }
}
```

**Erreurs :**
- `401` : Token invalide ou absent
- `500` : Erreur serveur

---

#### 4. Mettre à jour le profil
```
PUT /auth/profile
Authorization: Bearer <token>
```

**Body :**
```json
{
  "nickname": "Johnny",
  "bio": "Passionate reader and book lover"
}
```

**Validations :**
- Au moins un champ (nickname ou bio) requis
- `nickname` : max 50 caractères, ne peut pas être vide
- `bio` : max 500 caractères
- Email et username ne peuvent pas être modifiés

**Réponse (200) :**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "nickname": "Johnny",
    "bio": "Passionate reader and book lover"
  }
}
```

**Erreurs :**
- `400` : Champs invalides ou aucun champ fourni
- `401` : Token invalide ou absent
- `404` : Utilisateur non trouvé
- `500` : Erreur serveur

---

#### 5. Modifier le mot de passe
```
PUT /auth/password
Authorization: Bearer <token>
```

**Body :**
```json
{
  "currentPassword": "securepassword123",
  "newPassword": "newsecurepassword456",
  "confirmPassword": "newsecurepassword456"
}
```

**Validations :**
- Tous les champs obligatoires
- Nouveau mot de passe : min 8 caractères, max 128 caractères
- Les deux nouveaux mots de passe doivent correspondre
- Le nouveau mot de passe doit être différent de l'actuel

**Réponse (200) :**
```json
{
  "message": "Password updated successfully"
}
```

**Erreurs :**
- `400` : Champs manquants ou validations échouées
- `401` : Token invalide ou mot de passe actuel incorrect
- `404` : Utilisateur non trouvé
- `500` : Erreur serveur

---

#### 6. Télécharger une photo de profil
```
POST /auth/profile-picture
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data) :**
- `profilePicture` : Fichier image (JPG, PNG, WebP, etc.)

**Réponse (200) :**
```json
{
  "message": "Profile picture uploaded successfully",
  "profilePictureUrl": "/profile_pictures/1.png",
  "fileName": "1.png"
}
```

**Notes :**
- L'image est sauvegardée dans `/profile_pictures` avec le nom `{userId}.{extension}`
- Si une image existe déjà pour cet utilisateur, elle est supprimée
- L'image est accessible à l'URL `/profile_pictures/{fileName}`
- Les dimensions recommandées : minimum 200x200px
- Formats acceptés : JPG, PNG, WebP, GIF

**Erreurs :**
- `400` : Aucun fichier fourni
- `401` : Token invalide ou absent
- `500` : Erreur serveur

---

#### 7. Récupérer la photo de profil d'un utilisateur
```
GET /auth/profile-picture/:userId
```

**Paramètres :**
- `userId` : ID de l'utilisateur (numérique)

**Réponse (200) :**
- Retourne le fichier image avec les headers appropriés

**Erreurs :**
- `400` : ID utilisateur invalide
- `404` : Photo de profil non trouvée
- `500` : Erreur serveur

---

### 📖 Livres (`/books`)

#### 1. Rechercher des livres via Google Books API
```
GET /books?q=search_term
```

**Paramètres Query :**
- `q` (requis) : Terme de recherche (ex: "Harry Potter", "George Orwell")

**Réponse (200) :**
```json
{
  "books": [
    {
      "id": "uBLfNAEACAAJ",
      "title": "Harry Potter and the Philosopher's Stone",
      "authors": ["J. K. Rowling"],
      "description": "Harry Potter has never even heard of Hogwarts when the letters start arriving on the doorstep...",
      "pageCount": 223,
      "publishedDate": "1997-06-26",
      "publisher": "Bloomsbury",
      "language": "en",
      "categories": ["Juvenile Fiction"],
      "isbn13": "978-0747532699",
      "images": {
        "thumbnail": "http://books.google.com/books/content?...",
        "small": "http://books.google.com/books/content?..."
      }
    }
  ]
}
```

**Notes :**
- Les résultats sont sauvegardés en base de données pour optimiser les recherches futures
- Si la limite de requêtes Google Books API est atteinte (429 Too Many Requests), les données en cache seront utilisées

**Erreurs :**
- `400` : Paramètre `q` manquant
- `500` : Erreur lors de la recherche

---

#### 2. Rechercher des livres dans la base de données locale
```
GET /books/search?q=search_term
```

**Paramètres Query :**
- `q` (requis) : Terme de recherche dans le titre des livres

**Réponse (200) :**
```json
{
  "books": [
    {
      "id": "uBLfNAEACAAJ",
      "title": "Harry Potter and the Philosopher's Stone",
      "authors": ["J. K. Rowling"],
      "publisher": "Bloomsbury",
      "description": "...",
      "pageCount": 223,
      "publishedDate": "1997-06-26",
      "isbn13": "978-0747532699",
      "categories": ["Juvenile Fiction"],
      "language": "en",
      "images": { "thumbnail": "...", "small": "..." }
    }
  ]
}
```

**Notes :**
- Cette route recherche uniquement dans les livres présents en base de données locale
- Plus rapide que la recherche Google Books API

**Erreurs :**
- `400` : Paramètre `q` manquant
- `500` : Erreur lors de la recherche

---

#### 3. Récupérer un livre par ID
```
GET /books/:id
```

**Paramètres :**
- `id` (requis) : ID du livre Google Books

**Réponse (200) :**
```json
{
  "book": {
    "id": "uBLfNAEACAAJ",
    "title": "Harry Potter and the Philosopher's Stone",
    "authors": ["J. K. Rowling"],
    "description": "Harry Potter has never even heard of Hogwarts when the letters start arriving on the doorstep...",
    "pageCount": 223,
    "publishedDate": "1997-06-26",
    "publisher": "Bloomsbury",
    "language": "en",
    "categories": ["Juvenile Fiction"],
    "isbn13": "978-0747532699",
    "images": {
      "thumbnail": "http://books.google.com/books/content?...",
      "small": "http://books.google.com/books/content?..."
    }
  }
}
```

**Notes :**
- Vérifie d'abord la base de données locale
- Si non trouvé localement, interroge l'API Google Books

**Erreurs :**
- `404` : Livre non trouvé
- `500` : Erreur serveur

---

### 📚 Bibliothèque Personnelle (`/library`)

#### 1. Récupérer la bibliothèque de l'utilisateur
```
GET /library
Authorization: Bearer <token>
```

**Réponse (200) :**
```json
{
  "books": [
    {
      "id": "uBLfNAEACAAJ",
      "title": "Harry Potter and the Philosopher's Stone",
      "authors": ["J. K. Rowling"],
      "publisher": "Bloomsbury",
      "published_date": "1997-06-26",
      "description": "...",
      "isbn13": "978-0747532699",
      "page_count": 223,
      "categories": ["Juvenile Fiction"],
      "language": "en",
      "images": { "thumbnail": "...", "small": "..." },
      "status": "POSSESSION",
      "current_page": 150
    }
  ]
}
```

**Erreurs :**
- `401` : Token invalide ou absent
- `500` : Erreur serveur

---

#### 2. Ajouter un livre à la bibliothèque
```
POST /library/:id
Authorization: Bearer <token>
```

**Paramètres :**
- `id` (requis) : ID du livre Google Books

**Body :**
```json
{
  "status": "POSSESSION",
  "current_page": 0
}
```

**Statuts valides :**
- `WISHLIST` : Livre souhaité
- `POSSESSION` : Livre en possession

**Notes :**
- Si le livre n'existe pas en base de données, il sera automatiquement récupéré depuis l'API Google Books et inséré
- `current_page` est optionnel (par défaut: 0)
- Si le statut est `WISHLIST`, `current_page` sera automatiquement défini à 0

**Réponse (201) :**
```json
{
  "message": "Book added to your library",
  "bookId": "uBLfNAEACAAJ",
  "status": "POSSESSION"
}
```

**Erreurs :**
- `400` : Statut invalide ou manquant
- `401` : Token invalide ou absent
- `404` : Livre non trouvé dans Google Books API
- `409` : Le livre est déjà dans la bibliothèque
- `500` : Erreur serveur

---

#### 3. Mettre à jour un livre dans la bibliothèque
```
PUT /library/:id
Authorization: Bearer <token>
```

**Paramètres :**
- `id` (requis) : ID du livre

**Body :**
```json
{
  "status": "POSSESSION",
  "current_page": 100
}
```

**Validations :**
- `current_page` doit être un entier non-négatif
- `current_page` ne peut pas dépasser le nombre total de pages du livre

**Réponse (200) :**
```json
{
  "message": "Book updated in your library",
  "bookId": "uBLfNAEACAAJ",
  "status": "POSSESSION",
  "current_page": 100
}
```

**Erreurs :**
- `400` : Format invalide de `current_page`
- `401` : Token invalide ou absent
- `404` : Livre non trouvé dans la bibliothèque
- `500` : Erreur serveur

---

#### 4. Supprimer un livre de la bibliothèque
```
DELETE /library/:id
Authorization: Bearer <token>
```

**Paramètres :**
- `id` (requis) : ID du livre

**Réponse (200) :**
```json
{
  "message": "Book removed from your library",
  "bookId": "uBLfNAEACAAJ"
}
```

**Erreurs :**
- `401` : Token invalide ou absent
- `404` : Livre non trouvé dans la bibliothèque
- `500` : Erreur serveur

---

## 🗄️ Base de Données

### Schéma

**Table `users`**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Table `books`**
```sql
CREATE TABLE books (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  authors JSON,
  publisher VARCHAR(255),
  published_date DATE,
  description LONGTEXT,
  isbn13 VARCHAR(13),
  page_count INT,
  categories JSON,
  language VARCHAR(10),
  images JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Table `users_books`**
```sql
CREATE TABLE users_books (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  book_id VARCHAR(50) NOT NULL,
  status ENUM('WISHLIST', 'POSSESSION', 'READING', 'FINISHED') NOT NULL,
  current_page INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_book (user_id, book_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

---

## 📦 Dépendances

| Package | Version | Utilité |
|---------|---------|---------|
| express | ^5.2.1 | Framework web |
| bcrypt | ^6.0.0 | Hashage des mots de passe |
| jsonwebtoken | ^9.0.3 | Authentification JWT |
| mysql2 | ^3.16.1 | Driver MySQL |
| multer | ^2.0.2 | Upload de fichiers |
| cors | ^2.8.5 | CORS middleware |
| dotenv | ^17.2.3 | Variables d'environnement |
| nodemon | ^3.1.11 | Rechargement automatique (dev) |

---

## 📁 Structure du Projet

```
palu-api/
├── app.js                      # Point d'entrée
├── package.json               # Dépendances
├── .env                        # Variables d'environnement (à créer)
├── README.md                   # Ce fichier
├── configuration/
│   └── database.js            # Configuration MySQL
├── middleware/
│   ├── authenticateToken.js   # Vérification JWT
│   └── uploadProfilePicture.js # Upload multer
├── routes/
│   ├── auth.js                # Routes authentification
│   ├── books.js               # Routes livres
│   └── library.js             # Routes bibliothèque
├── utils/
│   └── transformGoogleBook.js # Transformation données API Google
└── profile_pictures/          # Stockage des photos de profil
```

---

## 🔒 Sécurité

- ✅ Tokens JWT avec expiration (90 jours)
- ✅ Mots de passe hashés avec bcrypt (10 rounds)
- ✅ Validation des données entrantes
- ✅ Middleware d'authentification sur routes protégées
- ✅ CORS configuré
- ✅ Gestion des erreurs sans révéler d'infos sensibles

---

## ⚠️ Gestion des Erreurs

Tous les endpoints retournent des réponses d'erreur au format :

```json
{
  "error": "Description de l'erreur"
}
```

Codes HTTP utilisés :
- `200` : Succès
- `201` : Création réussie
- `400` : Requête invalide
- `401` : Non authentifié
- `404` : Ressource non trouvée
- `409` : Conflit (ex: doublon)
- `500` : Erreur serveur

---

## 🚨 Limites Connues

- Limites de requêtes API Google Books (429 Too Many Requests)
- Authentification base de données peut échouer si identifiants incorrects
- Le fichier docker config.json doit être correctement configuré pour les déploiements Docker

---

## 📝 Notes Importantes

1. **Photos de profil** : Stockées localement dans `/profile_pictures`, nommées selon l'ID utilisateur
2. **JWT** : Valide 90 jours après émission
3. **Mots de passe** : Minimum 8 caractères, maximum 128 caractères
4. **Livres** : Les données complètes sont synchronisées depuis l'API Google Books

---

## 👨‍💻 Développement

Pour ajouter une nouvelle route :

1. Créez la fonction dans le fichier route approprié (`/routes`)
2. Utilisez le middleware `authenticateToken` si protégée
3. Validez les données entrantes
4. Retournez des réponses appropriées avec codes HTTP corrects
5. Documentez dans ce README

---

## 📞 Support

En cas de problème :

1. Vérifiez les logs du serveur
2. Assurez-vous que les variables `.env` sont correctement configurées
3. Vérifiez la connexion à la base de données MySQL
4. Vérifiez que votre API Key Google Books est valide

---

**Version API** : 1.0.0  
**Dernière mise à jour** : Janvier 2026
