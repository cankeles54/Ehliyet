@echo off
cd /d "%~dp0"
echo Yol Arkadasim yerel sunucusu baslatiliyor...
echo Tarayici 2 saniye icinde otomatik acilacak: http://127.0.0.1:4173
echo Kapatmak icin bu pencereye gelip Ctrl+C tusla.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://127.0.0.1:4173"
where node >nul 2>nul
if %errorlevel%==0 (
  node server.mjs
) else if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs
) else (
  echo Node.js bulunamadi. Node.js 20 veya daha yeni bir surum kurmalisin.
)
pause
