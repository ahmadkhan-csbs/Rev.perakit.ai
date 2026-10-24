@echo off
title Rev.perakit.ai — Launcher
cd /d %~dp0code

if not exist node_modules (
  echo Pehli baar setup ho raha hai — npm install chal raha hai, 2-3 minute lagenge...
  call npm install
)

if not exist .env (
  echo.
  echo *** RUKO: pehle code folder me .env file banao ***
  echo Usme ye 3 lines honi chahiye ^(apni asli keys ke saath^):
  echo DEEPGRAM_API_KEY=...
  echo GROQ_API_KEY=gsk_...
  echo LLM_PROVIDER=groq
  echo.
  echo Format dekhne ke liye .env.example file kholo.
  pause
  exit /b
)

echo Gateway aur Website dono start ho rahe hain...
start "Rev Gateway (band mat karna)" cmd /k npx tsx apps\gateway\src\index.ts
timeout /t 5 >nul
start "Rev Web (band mat karna)" cmd /k npm run dev --workspace=@rev/web
timeout /t 10 >nul
start http://localhost:3000/session

echo.
echo Ho gaya! Browser me http://localhost:3000/session khul raha hai.
echo Dono kaali windows khuli rakhna — wahi engine aur website hain.
pause
