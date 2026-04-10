#!/bin/bash

echo "=========================================="
echo "     FuckBusu par Haksko <3 - Launcher"
echo "=========================================="
echo ""

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERREUR] Node.js n'est pas installé."
    exit 1
fi

# Install dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installation des dépendances Frontend..."
    npm install
fi
if [ ! -d "backend/node_modules" ]; then
    echo "[INFO] Installation des dépendances Backend..."
    cd backend && npm install && cd ..
fi

# Configuration (.env)
UPDATE_CREDS="Y"
if [ -f ".env" ]; then
    echo "Un fichier de configuration existe déjà."
    read -p "Voulez-vous conserver les identifiants actuels ? (O/N) [Défaut: O]: " USE_EXISTING
    USE_EXISTING="${USE_EXISTING:-O}"
    if [[ "${USE_EXISTING,,}" == "o" ]]; then
        UPDATE_CREDS="N"
    fi
fi

if [ "$UPDATE_CREDS" == "Y" ]; then
    echo ""
    echo "[CONFIGURATION]"
    echo "Veuillez entrer vos identifiants Busuu."
    echo ""
    read -p "Email Busuu: " BUSUU_EMAIL
    read -s -p "Mot de passe Busuu: " BUSUU_PASSWORD
    echo ""

    cat > .env <<EOF
VITE_BUSUU_EMAIL=${BUSUU_EMAIL}
VITE_BUSUU_PASSWORD=${BUSUU_PASSWORD}
BUSUU_EMAIL=${BUSUU_EMAIL}
BUSUU_PASSWORD=${BUSUU_PASSWORD}
EOF
    echo "[OK] Configuration sauvegardée."
fi

echo ""
echo "[LANCEMENT] Démarrage des serveurs..."
echo ""

# Start Backend in background
echo "[INFO] Démarrage du Backend sur http://localhost:8000..."
cd backend && node index.js &
BACKEND_PID=$!
cd ..

sleep 2

# Start Frontend
echo "[INFO] Démarrage du Frontend sur http://localhost:3000..."
echo "Ouvrez http://localhost:3000 dans votre navigateur."
npm run dev

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
