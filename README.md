# AutoBusuu - Version corrigee

Version corrigee et amelioree de **AutoBusuu** (anciennement FuckBusuu), originalement cree par **Haksko91**.

## Description

Auto-solveur pour Busuu qui automatise les lecons via Puppeteer (navigateur Chrome) et une interface de controle React.

### Fonctionnalites

- Resolution automatique des exercices (QCM, sequences, saisie de texte)
- Exercices d'ecriture communautaire (remplissage automatique du nombre de mots requis)
- Skip automatique des lecons "Conversations avec l'IA" et "Entrainement oral"
- Bypass des exercices audio (lancement + arret immediat de l'enregistrement)
- Interface web avec theme sombre
- Logs en temps reel avec indicateurs colores (vert = succes, rouge = echec)

## Prerequis

- **Node.js** v18+ (installe via [nvm](https://github.com/nvm-sh/nvm) recommande)
- **npm** (inclus avec Node.js)
- **Google Chrome** (utilise par Puppeteer)

## Installation

```bash
npm install
cd backend && npm install
```

## Lancement

### Linux / macOS

```bash
# Terminal 1 - Backend
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
cd backend && node index.js

# Terminal 2 - Frontend
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
npm run dev
```

### Windows

```bat
start.bat
```

### Acces

- Frontend : http://localhost:3000
- Backend : http://localhost:8000

## Arret

```bash
fuser -k 8000/tcp 3000/tcp
```

## Credits

- Projet original : **AutoBusuu** (anciennement FuckBusuu) par **Haksko91**
- Version corrigee par **shalk**
