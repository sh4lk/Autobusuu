# Requirements - AutoBusuu (version corrigee)

> Version corrigee de AutoBusuu (anciennement FuckBusuu), originalement cree par **Haksko91**.

## Environnement

| Outil      | Version minimum |
|------------|-----------------|
| Node.js    | 18+             |
| npm        | 9+              |
| Chrome     | derniere version|

## Dependencies Frontend

| Package              | Version   |
|----------------------|-----------|
| react                | ^19.2.1   |
| react-dom            | ^19.2.1   |
| lucide-react         | ^0.556.0  |
| @google/genai        | ^1.31.0   |
| vite                 | ^6.2.0    |
| typescript           | ~5.8.2    |
| @vitejs/plugin-react | ^5.0.0    |

## Dependencies Backend

| Package        | Version   |
|----------------|-----------|
| express        | ^4.18.2   |
| puppeteer      | ^22.0.0   |
| cors           | ^2.8.5    |
| dotenv         | ^16.4.1   |
| @google/genai  | ^1.31.0   |

## Variables d'environnement (optionnel)

Creer un fichier `.env` a la racine :

```
BUSUU_EMAIL=ton_email@exemple.com
BUSUU_PASSWORD=ton_mot_de_passe
GEMINI_API_KEY=ta_cle_gemini
```
