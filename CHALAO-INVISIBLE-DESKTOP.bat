@echo off
title Rev.perakit.ai — 100% Invisible Desktop Copilot
cd /d %~dp0code

echo ========================================================
echo   REV.PERAKIT.AI — 100%% INVISIBLE DESKTOP COPILOT
echo ========================================================
echo  [1] Invisible on Screen Share (WDA_EXCLUDEFROMCAPTURE)
echo  [2] Invisible in Taskbar (skipTaskbar)
echo  [3] Invisible in Task Manager (Masked Process)
echo  [4] Invisible to Tab Switching (Always Focused Test)
echo  [5] Cursor Undetectability (Alt+X Click-Through)
echo  [6] Webcam Teleprompter Mode (Alt+T)
echo  [7] LeetCode Auto Snip (Ctrl+Alt+S)
echo ========================================================
echo.

:: Server Running Check
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
  echo [Info] Background Servers chalu nahi the, start ho rahe hain...
  start "Rev Gateway Engine" /min cmd /c npx tsx apps\gateway\src\index.ts
  start "Rev Web Server" /min cmd /c npm run dev --workspace=@rev/web
  echo Waiting for servers to initialize (6 seconds)...
  timeout /t 6 >nul
) else (
  echo [OK] Background Web Server already active!
)

echo.
echo Starting Invisible Floating Overlay Desktop App...
echo [Tip] Press Alt+X for click-through toggle, Alt+T for Teleprompter.
echo.

call npx electron apps\desktop\main.js

pause
