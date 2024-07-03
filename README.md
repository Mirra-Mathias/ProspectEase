# ProspectEase

### Étape 1 : Se connecter au compte LinkedIn pro

1. Ouvrez votre navigateur et allez sur [LinkedIn](https://www.linkedin.com/).
2. Connectez-vous avec les identifiants LinkedIn.

### Étape 2 : Créer une liste de prospects

1. Allez sur [LinkedIn Sales Navigator](https://www.linkedin.com/sales/lists/people).
2. Créez une nouvelle liste de prospects en cliquant sur le bouton "Create a list".
3. Donnez un nom à votre liste et enregistrez-la.

### Étape 3 : Faire une recherche avancée de prospects et les ajouter à la liste

1. Allez sur [LinkedIn Sales Navigator Advanced Search](https://www.linkedin.com/sales/search/people?viewAllFilters=true).
2. Utilisez les filtres pour affiner votre recherche de prospects.
3. Sélectionnez les prospects pertinents et ajoutez-les à votre liste en utilisant l'option "Save to list".

### Étape 4 : Modifier la variable `SALE_LIST_URL` dans le fichier `index.js`

1. Ouvrez votre projet dans votre éditeur de code préféré.
2. Localisez le fichier `index.js`.
3. Modifiez la ligne où `SALE_LIST_URL` est définie pour qu'elle corresponde à l'URL de votre liste de prospects créée à l'étape 2. Par exemple :
    ```javascript
    const SALE_LIST_URL = 'your_sales_list_url';
    ```

### Étape 5 : Ajouter le fichier `.env`

1. Créez un fichier `.env` à la racine de votre projet.
2. Ajoutez les variables suivantes, en remplaçant les exemples par vos informations réelles :
    ```env
    # LinkedIn credentials
    LINKEDIN_EMAIL=your_linkedin_email@example.com
    LINKEDIN_PASSWORD="your_linkedin_password"

    # Kaspr credentials
    KASPR_EMAIL=your_kaspr_email@example.com
    KASPR_PASSWORD="your_kaspr_password"
    ```

### Étape 6 : Vérifier la configuration dans `index.js`

1. Ouvrez le fichier `index.js` dans votre éditeur de code.
2. Assurez-vous que la variable `SALE_LIST_URL` est correctement définie avec l'URL de votre liste de prospects.

### Étape 7 : Démarrer le projet

1. Ouvrez votre terminal.
2. Naviguez vers le répertoire de votre projet.
3. Exécutez la commande suivante pour démarrer le projet :
    ```sh
    npm start
    ```
