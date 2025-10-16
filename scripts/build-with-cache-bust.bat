@echo off
REM Build script sa cache busting (Windows)

echo 🔧 Building Fiskalni Račun with cache busting...

REM 1. Obrisi stari dist
if exist dist (
    echo Brisim stari dist folder...
    rmdir /s /q dist
)

REM 2. Generiši BUILD_TIME timestamp
for /f "tokens=*" %%i in ('powershell -Command "Get-Date -AsUTC -Format 'yyyy-MM-ddTHH:mm:ssZ'"') do set BUILD_TIME=%%i
echo 📅 Build timestamp: %BUILD_TIME%

REM 3. Build sa VITE_BUILD_VERSION
set VITE_BUILD_VERSION=%BUILD_TIME%

REM 4. Pokreni build
call npm run build

REM 5. Prikaži info o cache busting
echo.
echo ✅ Build completed successfully!
echo.
echo 🔄 Cache busting strategy:
echo    - All JS/CSS files have unique [hash] in filename
echo    - Service Worker cleans up outdated caches on activation
echo    - index.html detects and clears old caches on load
echo    - PWA update notification triggers aggressive refresh
echo.
echo 📊 Bundle info available at: dist/stats.html

pause
