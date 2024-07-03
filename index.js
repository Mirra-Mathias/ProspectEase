const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();  // Charger les variables d'environnement à partir du fichier .env

const LINKEDIN_URL = 'https://www.linkedin.com/login';
const KASPR_URL = 'https://app.kaspr.io/signin';
const SALE_LIST_URL = 'https://www.linkedin.com/sales/lists/people/7213990153004982274?sortCriteria=CREATED_TIME&sortOrder=DESCENDING';

const LINKEDIN_CREDENTIALS = {
  email: process.env.LINKEDIN_EMAIL,
  password: process.env.LINKEDIN_PASSWORD
};

const KASPR_CREDENTIALS = {
  email: process.env.KASPR_EMAIL,
  password: process.env.KASPR_PASSWORD
};

const COOKIES_PATH = path.resolve(__dirname, 'cookies.json');
const EXTENSION_PATH = path.resolve(__dirname, 'kaspr_extension'); // Chemin vers le dossier de l'extension Kaspr

const waitFor = (time) => {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
};

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--enable-automation',
      '--disable-features=IsolateOrigins,site-per-process',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  const context = await browser.defaultBrowserContext();
  await context.overridePermissions('https://www.linkedin.com', ['clipboard-read', 'clipboard-write']);
  const page = await browser.newPage();

  // Charger les cookies si disponibles
  const previousSession = fs.existsSync(COOKIES_PATH);
  if (previousSession) {
    const cookiesString = fs.readFileSync(COOKIES_PATH);
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
  }

  await page.goto('https://www.linkedin.com/sales');

  // Vérifier si la connexion est nécessaire
  const loginRequired = await page.$('#username') !== null;

  if (loginRequired) {
    await page.goto(LINKEDIN_URL);
    // Se connecter à LinkedIn
    await loginToLinkedIn(page);
  }

  // Sauvegarder les cookies après la connexion
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));

  // Aller à Kaspr et se connecter si nécessaire
  await page.goto(KASPR_URL);
  await waitFor(1000); // Attendre que la page se charge

  // Vérifier si la connexion est nécessaire
  if (!(await isUserLoggedInKaspr(page))) {
    await loginToKaspr(page);
  }

  // Aller à la page de la liste LinkedIn Sales Navigator
  await page.goto(SALE_LIST_URL);
  
  let profiles = [];

  while (true) {
    // Attendre que la page se charge
    await waitFor(5000);

    const extractedProfiles = await page.$$eval(
      "tr[data-x--people-list--row]",
      rows => rows.map(row => {
        const nameElement = row.querySelector("a[data-x--people-list--person-name]");
        const urlElement = nameElement ? nameElement.href : null;
        const companyElement = row.querySelector(".list-lead-detail__account .artdeco-entity-lockup__title span");
    
        return {
          name: nameElement ? nameElement.textContent.trim() : null,
          url: urlElement,
          company: companyElement ? companyElement.textContent.trim() : null
        };
      })
    );

    for (const profile of extractedProfiles) {
      // Ouvrir le profil dans un nouvel onglet
      const profilePage = await browser.newPage();
      await profilePage.goto(profile.url);
      await waitFor(5000); // Attendre que la page du profil se charge

      // Vérifier si la page est toujours attachée
      if (!profilePage.isClosed()) {
        // Cliquer sur le bouton de menu des actions du profil
        await profilePage.click('button[aria-label="Ouvrir le menu de dépassement de capacité des actions"]');
        await waitFor(1000); // Attendre que le menu s'affiche

        // Sélectionner l'option "Copier URL LinkedIn.com"
        await profilePage.evaluate(() => {
          const buttons = [...document.querySelectorAll('button')];
          const copyButton = buttons.find(button => button.textContent.includes('Copier URL LinkedIn'));
          if (copyButton) copyButton.click();
        });

        // Focaliser la page avant de lire le presse-papiers
        await profilePage.bringToFront();

        // Récupérer l'URL du profil à partir du presse-papiers
        const profileUrl = await profilePage.evaluate(async () => {
          return await navigator.clipboard.readText();
        });

        await profilePage.close();

        const kasprPage = await browser.newPage();
        await kasprPage.goto(profileUrl);
        await waitFor(5000); // Attendre que la page du profil se charge

        // Cliquer sur le bouton Kaspr
        await kasprPage.waitForSelector('#KasprPluginBtn button');
        await kasprPage.click('#KasprPluginBtn button');
        await waitFor(2000); // Attendre que le bouton apparaisse

        // Cliquer sur le bouton "Afficher les coordonnées"
        const showContactInfoButton = await kasprPage.$('.btn-in.searching-contact-info button.btn.sm.step1');
        if (showContactInfoButton) {
          await showContactInfoButton.click();
          await waitFor(5000); // Attendre que les coordonnées soient affichées
        }
        // Récupérer l'adresse e-mail
        const email = await kasprPage.evaluate(() => {
          // Chercher l'email dans .to-clipboard-wrapper .to-clipboard
          let emailElement = document.querySelector('.user-info .to-clipboard-wrapper .to-clipboard');
          let emailText = emailElement ? emailElement.innerText : null;
          return emailText && emailText.includes('@') ? emailText : null;
        });

        await kasprPage.close();

        if (email) {
          profiles.push({
            name: profile.name,
            url: profileUrl,
            company: profile.company,
            email: email,
          });
        }
      }
    }

    // Cliquer sur le bouton "Suivant" pour aller à la page suivante
    const nextButton = await page.$("button[aria-label='Suivant']");
    if (nextButton) {
      await nextButton.click();
    } else {
      break; // Si le bouton "Suivant" n'est pas trouvé, terminer la boucle
    }
  }

  // Séparer les noms et prénoms, et ajouter une entête
  const csvContent = [
    'Prénom,Nom,URL,Email,Entreprise',
    ...profiles.map(profile => {
      const [prenom, ...nomParts] = profile.name.split(' ');
      const nom = nomParts.join(' ');
      return `${prenom},${nom},${profile.url},${profile.email},${profile.company}`;
    })
  ].join('\n');

  fs.writeFileSync('linkedin_profiles.csv', csvContent);

  await browser.close();
})();

async function loginToLinkedIn(page) {
  await page.type('#username', LINKEDIN_CREDENTIALS.email, { delay: 30 });
  await page.type('#password', LINKEDIN_CREDENTIALS.password, { delay: 30 });
  await page.click('.btn__primary--large');
  await page.waitForNavigation();
}

async function isUserLoggedInKaspr(page) {
  try {
    // Vérifier si l'élément spécifique au profil utilisateur est présent
    await page.waitForSelector('.user-menu', { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

async function loginToKaspr(page) {
  await page.type('input[type="text"]', KASPR_CREDENTIALS.email, { delay: 30 });
  await page.click('button[type="submit"]'); // Cliquer sur le bouton "Poursuivre"
  await waitFor(1000); // Attendre que le champ de mot de passe apparaisse
  await page.type('input[type="password"]', KASPR_CREDENTIALS.password, { delay: 30 });
  await page.click('button[type="submit"]'); // Cliquer sur le bouton "C'est parti"
  await page.waitForNavigation();
}
