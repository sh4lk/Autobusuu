@echo off
setlocal EnableDelayedExpansion

echo ==========================================
echo      Busuu Solver - Shalk
echo ==========================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe. Veuillez l'installer depuis https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Install Dependencies if missing
if not exist "node_modules" (
    echo [INFO] Installation des dependances Frontend...
    call npm install
)
if not exist "backend\node_modules" (
    echo [INFO] Installation des dependances Backend...
    cd backend
    call npm install
    cd ..
)

:: 3. Configuration (.env)
set "UPDATE_CREDS=Y"
if exist ".env" (
    echo Un fichier de configuration existe deja.
    set /p "USE_EXISTING=Voulez-vous conserver les identifiants actuels ? (O/N) [Defaut: O]: "
    if /i "!USE_EXISTING!"=="O" set "UPDATE_CREDS=N"
    if "!USE_EXISTING!"=="" set "UPDATE_CREDS=N"
)

if "!UPDATE_CREDS!"=="Y" (
    echo.
    echo [CONFIGURATION]
    echo Veuillez entrer vos identifiants Busuu.
    echo.
    
    set /p BUSUU_EMAIL="Email Busuu: "
    set /p BUSUU_PASSWORD="Mot de passe Busuu: "
    
    echo.
    echo Mise a jour du fichier .env...
    
    (
    echo VITE_BUSUU_EMAIL=!BUSUU_EMAIL!
    echo VITE_BUSUU_PASSWORD=!BUSUU_PASSWORD!
    echo BUSUU_EMAIL=!BUSUU_EMAIL!
    echo BUSUU_PASSWORD=!BUSUU_PASSWORD!
    ) > .env
    
    echo [OK] Configuration sauvegardee.
)

:: 4. Start Application
echo.
echo [LANCEMENT] Demarrage des serveurs...
echo.

:: Start Backend in a new window
start "FuckBusu Backend" cmd /c "cd backend && npm start"

:: Start Frontend in the current window
echo Le Frontend va demarrer. Une fois lance, ouvrez http://localhost:3000 dans votre navigateur.
call npm run dev

pause
