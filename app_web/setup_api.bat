@echo off
echo ========================================
echo Configuration de l'API IoTinel IDS
echo ========================================
echo.

echo Etape 1: Verification de XAMPP...
if not exist "C:\xampp" (
    echo ERREUR: XAMPP n'est pas installe dans C:\xampp
    echo Veuillez installer XAMPP depuis https://www.apachefriends.org/
    pause
    exit /b 1
)
echo XAMPP trouve dans C:\xampp

echo.
echo Etape 2: Copie des fichiers API...
if not exist "api" (
    echo ERREUR: Dossier api introuvable
    pause
    exit /b 1
)

xcopy /E /I /Y api C:\xampp\htdocs\api\
if %errorlevel% neq 0 (
    echo ERREUR: Echec de la copie des fichiers API
    pause
    exit /b 1
)
echo Fichiers API copies avec succes

echo.
echo Etape 3: Instructions pour la base de donnees
echo ===============================================
echo 1. Ouvrez le panneau de controle XAMPP
echo 2. Cliquez sur "Start" pour Apache et MySQL
echo 3. Ouvrez http://localhost/phpmyadmin dans votre navigateur
echo 4. Creez une base de donnees nommee 'iotinel_ids'
echo 5. Importez le fichier api/database.sql dans cette base
echo.

echo Configuration terminee!
echo.
echo Pour tester: http://localhost/api/users
echo.
pause