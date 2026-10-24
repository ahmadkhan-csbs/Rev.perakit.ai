@echo off
title Rev.perakit.ai — Windows Setup .EXE Builder
cd /d %~dp0code\apps\desktop

echo ========================================================
echo   REV.PERAKIT.AI — WINDOWS STANDALONE .EXE BUILDER
echo ========================================================
echo   Building 100%% Invisible Copilot Windows Setup (.exe)...
echo   Output folder: code\apps\desktop\dist\
echo ========================================================
echo.

call npx electron-builder --win --x64

echo.
echo ========================================================
echo   Build complete! Check folder: code\apps\desktop\dist\
echo ========================================================
pause
