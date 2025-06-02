DOCUMENT TECHNIQUE — APPLICATION MOBILE IMMOBILIÈRE

1. Présentation du projet
Nom du projet : OPHRUS Immo
Client : OPHRUS Groupe 
Développé par : CyberFusion
Date de début : Avril 2025
Technologie utilisée : React Native (Expo) + Backend Node.js / Express

2. Objectif de l'application
Ce projet vise à créer une application mobile simple d’utilisation qui facilite la recherche de maisons, d’appartements ou de terrains à louer ou à vendre au Congo. L’idée principale est de rendre les démarches immobilières plus faciles pour tous, en centralisant les offres sur une seule application fiable.

3. Fonctionnement général
Pour les utilisateurs :
•	Ils doivent se créer un compte ou se connecter pour accéder aux annonces
•	Ils peuvent parcourir les biens disponibles, lire les descriptions, voir les photos, et utiliser un bouton "Je suis intéressé / Mise en contact" pour manifester leur intérêt
Pour l’agence :
•	Elle garde le contrôle total sur la mise en relation avec les propriétaires
•	Elle reçoit les demandes et contacte les clients si elle juge la demande sérieuse
4. Authentification
•	Accès au contenu uniquement après inscription ou connexion
•	Connexion sécurisée avec mot de passe chiffré
•	Récupération de mot de passe possible (par e-mail ou SMS)
5. Gestion des demandes (Tickets)
Un "ticket" est une sorte de fiche de demande qu’un utilisateur envoie lorsqu’il est intéressé par un bien. Ce ticket est traité par l’agence.
Exemple :
•	M. Alvine voit une maison qui l’intéresse
•	Il clique sur “Je suis intéressé” et peut écrire un petit message
•	L’agence reçoit une alerte et peut accepter ou refuser la demande

6. Application mobile (Frontend avec React Native)
Les écrans principaux :
•	Page d’accueil
•	Liste des annonces
•	Détail d’un bien
•	Formulaire de demande
•	Espace personnel avec historique

7. Serveur (Backend avec Node.js / Express)
Ce qui se passe dans les coulisses :
•	Le serveur gère les utilisateurs, les annonces, et les tickets
•	Il protège les données et contrôle qui peut faire quoi

8. Modèle économique (Comment l’entreprise gagne de l’argent)
a. Commission sur transaction (Modèle principal)
L’agence prend une part sur chaque location ou vente conclue grâce à l’application.
b. Mise en avant des biens (future option)
Certains biens peuvent être mis en avant moyennant paiement
c. Accès agence partenaire (future option)
Des agences tierces peuvent diffuser leurs annonces via un abonnement
d. Données analytiques (future option)
Analyse de tendances immobilières vendue aux professionnels

9. Sécurité
•	Données protégées par des identifiants uniques et des jetons d’accès (JWT)
•	Seules les personnes autorisées peuvent voir ou modifier les données

10. Évolutions futures (après la première version)
•	Chatbot d’accueil pour guider les utilisateurs
•	Paiement en ligne pour réserver un bien
•	Carte interactive avec géolocalisation

 Production Complète
Objectif : Offrir une solution robuste, rapide, scalable et sécurisée, prête à gérer un trafic important, avec des outils premium.
Cette version est idéale dès que le service commence à recevoir des utilisateurs actifs ou qu’une mise en ligne publique est prévue.
Poste	Détails	Coût estimé 
Hébergement Backend (Railway Pro)	Offre Pro, rapide et stable pour Node.js.	120 000 XAF/an (~10 000 XAF/mois)
Base de données (MongoDB Atlas Flex)	Cluster flexible et scalable, ~8–18 USD/mois selon usage.	216 000 XAF/an (~18 000 XAF/mois)
Nom de domaine (.com ou .cd)	Nom de domaine professionnel.	8 000 XAF/an
Envoi d’e-mails transactionnels (MailerSend)	Envoi de mails automatisés (plan pro).	36 000 XAF/an (~3 000 XAF/mois)
Main-d'œuvre de conception et développement	Paiement unique. 30% à la commande.	600 000 XAF (180 000 XAF à la commande)
Frais de publication Google Play Store	Paiement unique.	14 500 XAF
Frais de publication Apple App Store	Compte développeur Apple annuel.	57 100 XAF/an (~99 USD/an)
Authentification OTP via Firebase	Option gratuite ou en fonction du volume.	Gratuit (limite Firebase)
TOTAL ESTIMÉ PRODUCTION		1 051 600 XAF

________________________________________

Au 18 avril 2025, le taux de change du dollar américain (USD) vers le franc CFA BEAC (XAF) est d'environ 576,72 XAF pour 1 USD, selon les données de Xe.
Pourquoi cette double approche ?
Le projet OPHRUS Immo est conçu pour être économique au départ, mais scalable et robuste dès que l’activité augmente.
Ce choix progressif permet de maîtriser les dépenses tout en anticipant la croissance du service.

🎯 Objectif : Générer de l’intérêt avant de demander un compte
En tant que développeur visionnaire et entrepreneur intelligent (oui, toi), tu dois comprendre le comportement utilisateur :

🧠 Un utilisateur inconnu, qui arrive sur un site immobilier, veut d’abord explorer, rêver, filtrer, s’imaginer…
👉 S’il doit créer un compte dès le début, sans voir les biens : il se barre.

🚪 Réponse claire et nette :
🔓 Le site web doit être en accès libre.
❌ Ne bloque pas l’accès à la liste des biens, ni aux fiches de détails.
✅ Mais demande une connexion uniquement pour certaines actions :

✅ Voilà comment tu gères ça comme un boss :
Action utilisateur	Connexion requise ?
Parcourir les biens	❌ Non
Voir la fiche détaillée d’un bien	❌ Non
Utiliser la recherche et les filtres	❌ Non
Ajouter un bien aux favoris	✅ Oui
Créer un ticket d’intérêt	✅ Oui
Voir ses favoris et ses tickets	✅ Oui

🧠 UX en béton armé : Flow intelligent
L’utilisateur arrive sur le site → Il explore librement.

Il clique sur ❤️ "Ajouter aux favoris" → 💡 Popup : "Connecte-toi pour sauvegarder ce bien."

Il veut faire une demande (ticket) → 💡 "Tu dois créer un compte pour envoyer ta demande."

👉 C’est fluide, logique, pas frustrant. Tu ne casses pas l’élan du client.

🧱 Architecture d’authentification conseillée (version MVP solide)
Pour le site web :
🔐 Authentification simple (Email + mot de passe)

🔁 Connexion / inscription

✅ JWT token ou session (selon backend)

📬 Confirmation par mail (facultatif mais pro)

🔐 Middleware de protection des routes /favoris, /tickets

Pour l’application mobile :
Auth obligatoire à l’ouverture (login/register)

Token JWT partagé ou Firebase Auth, selon ton stack

Récupération automatique de l’historique (tickets, favoris)

🔄 Synchronisation Web + Mobile :
Si le site et l’app partagent la même base de données/API, alors un seul compte pour les deux.
Tu connectes un utilisateur sur l’un, il retrouve ses données sur l’autre.

⚠️ Erreur à éviter :
Ne fais jamais une version “full protégée” où même l’accès au catalogue est verrouillé.
Montre tes maisons d’abord. Ensuite, propose l’inscription comme une valeur ajoutée.

✨ En résumé (plan clair) :
Élément	Site Web	Application Mobile
Accès libre à la vitrine immobilière	✅ Oui	❌ Non
Authentification requise pour actions privées	✅ Oui (favoris, tickets)	✅ Oui (dès l’ouverture)
Synchronisation des comptes et données	✅ Oui (backend commun)	✅ Oui

Site Web = Vitrine publique ➕ interface client (favoris, tickets)

App Mobile = Version + avancée pour clients fidèles

Panneau Admin = Géré par l’agence → gestion des biens, lecture des tickets, réponse aux messages

Pour lla maquette adapte un style moderne 

Parfait 👌 Tu as une charte graphique claire pour OPHRUS. Voici comment on va l’appliquer au frontend web :

🎨 🎯 Charte graphique OPHRUS appliquée au frontend React
✅ Couleurs :
Primaire : #009fe3 (CYAN) → boutons, éléments interactifs

Texte : #000000 (NOIR)

Fond : #ffffff (BLANC)

✅ Typographie (si dispo via Google Fonts ou import web) :
Gotham Black, Neue Montreal, Tusker Grotesk
(Sinon on utilisera leurs équivalents : Poppins, Inter, Montserrat)

🛠️ Stack technique (frontend web)
Framework : React + Vite

UI : Tailwind CSS (avec custom colors et fonts selon charte)

Composants : Shadcn/ui

Gestion auth : JWT + localStorage

Routing : React Router DOM

🔗 Connexion exacte au backend
On utilisera tes vraies routes API :

Fonction	Route backend
Récupérer les biens	GET /api/property
Détail bien	GET /api/property/:id
Créer compte	POST /api/users/register
Connexion	POST /api/users/login
Réinit. mot de passe (1,2,3)	reset-request, reset-verify, reset-password
Ajouter aux favoris	POST /api/favoris/:id
Voir favoris	GET /api/favoris
Créer ticket (intérêt)	POST /api/messages

🚀 Étapes à suivre maintenant
Lancer le projet Next.js Tailwind + charte graphique

Créer page d’accueil + catalogue de biens

Configurer les appels backend dynamiques

Ajouter l’auth (login/register/connexion JWT)

Créer pages protégées : favoris, tickets, profil


Très bonne remarque ✅ Oui, **Next.js** est encore plus adapté à ton projet pour :

* **Le SEO** (important pour un site immobilier)
* **Les performances** (SSR, SSG…)
* **Une architecture modulaire**
* **Une séparation claire des pages**
* Et surtout : parfaite intégration avec un backend Node/Express comme le tien

---

## ✅ On repart donc avec **Next.js + Tailwind + Charte graphique OPHRUS**

---

### 📁 Structure de base (Next.js 14+ – App Router)

```
/ophrous-frontend
│
├── public/                  # Fichiers statiques (logo, images, fonts)
│
├── src/
│   ├── app/                 # Pages, layout, routing
│   │   ├── layout.jsx       # Layout global (Header, Footer)
│   │   ├── page.jsx         # Page d'accueil
│   │   └── biens/page.jsx   # Liste des biens
│   │   └── login/page.jsx   # Connexion
│   │   └── profil/page.jsx  # Profil utilisateur
│   │   └── favoris/page.jsx # Favoris (protégé)
│   ├── components/          # Header, Footer, Card, Modals
│   ├── styles/              # tailwind.css + fonts
│   ├── lib/                 # Auth utils, API service (axios)
│   └── context/             # AuthContext + Provider
│
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
├── .env.local               # NEXT_PUBLIC_API_URL
└── README.md
```

---

### 🛠️ Commandes pour installer Next.js + Tailwind

```bash
# 1. Créer le projet Next.js avec app router
npx create-next-app@latest ophrous-frontend \
  --typescript \
  --app \
  --tailwind \
  --eslint \
  --src-dir \
  --import-alias "@/*"

cd ophrous-frontend
```

✅ Cette commande :

* Installe Tailwind
* Utilise `/src/app` pour le système de pages
* Active TypeScript (tu peux aussi utiliser JS si tu veux)

---

### ⚙️ Ce qu’on va intégrer ensuite :

* Charte graphique (cyan, noir, blanc, polices)
* Header/Footer modernes
* Appels à ton backend (`/api/property`, `/api/users/login`, etc.)
* AuthContext (JWT)
* Routing public/privé (`/favoris`, `/tickets` protégés)

---

/ (accueil) → SSG

/biens/[id] → SSR (car chaque bien est unique et change souvent)

/contact, /favoris → SSR ou client-side si besoin d’auth