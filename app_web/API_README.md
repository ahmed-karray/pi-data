# Configuration de l'API Backend pour IoTinel IDS

## Prérequis

1. **XAMPP** doit être installé et configuré
   - Téléchargez XAMPP depuis https://www.apachefriends.org/
   - Installez-le dans `C:\xampp\` (par défaut)

## Configuration de la Base de Données

### 1. Démarrer XAMPP
- Ouvrez le panneau de contrôle XAMPP
- Cliquez sur "Start" pour Apache et MySQL

### 2. Créer la base de données
- Ouvrez votre navigateur et allez sur `http://localhost/phpmyadmin`
- Cliquez sur "Nouvelle base de données" dans le menu de gauche
- Nommez-la `iotinel_ids` et cliquez sur "Créer"

### 3. Importer la structure de la base
- Sélectionnez la base `iotinel_ids` dans le menu de gauche
- Cliquez sur "Importer" dans le menu du haut
- Cliquez sur "Choisir un fichier" et sélectionnez `api/database.sql`
- Cliquez sur "Exécuter" en bas

## Configuration du Serveur

### 1. Placer les fichiers dans XAMPP
- Copiez tout le dossier `api/` dans `C:\xampp\htdocs\`
- Le chemin final devrait être `C:\xampp\htdocs\api\`

### 2. Modifier la configuration Apache (optionnel)
- Ouvrez `C:\xampp\apache\conf\httpd.conf`
- Assurez-vous que `mod_rewrite` est activé (ligne `LoadModule rewrite_module modules/mod_rewrite.so`)

## Tester l'API

### 1. Vérifier que l'API fonctionne
- Ouvrez `http://localhost/api/users` dans votre navigateur
- Vous devriez voir une liste d'utilisateurs en JSON

### 2. Tester la création d'utilisateur
Vous pouvez utiliser un outil comme Postman ou curl :

```bash
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "analyst"
  }'
```

## Comptes de test

Les comptes suivants sont créés par défaut :
- **alice@company.com** / password (Admin)
- **bob@company.com** / password (Analyst)
- **charlie@company.com** / password (Data Scientist - inactif)
- **diana@company.com** / password (Analyst)

## Dépannage

### Erreur de connexion à la base de données
- Vérifiez que MySQL est démarré dans XAMPP
- Vérifiez les identifiants dans `api/config.php`

### Erreur 404 sur l'API
- Vérifiez que les fichiers sont bien dans `C:\xampp\htdocs\api\`
- Redémarrez Apache dans XAMPP

### Erreur CORS
- L'API est configurée pour accepter les requêtes depuis n'importe quelle origine
- Si vous avez des problèmes, vérifiez les headers dans `api/config.php`

## Structure des fichiers API

```
api/
├── config.php          # Configuration de la base de données
├── User.php           # Classe pour gérer les utilisateurs
├── index.php          # Point d'entrée de l'API
└── database.sql       # Script de création de la base
```

## Endpoints API

- `GET /api/users` - Récupérer tous les utilisateurs
- `POST /api/users` - Créer un nouvel utilisateur
- `PUT /api/users/{id}` - Modifier un utilisateur
- `DELETE /api/users/{id}` - Supprimer un utilisateur
- `POST /api/auth` - Authentifier un utilisateur