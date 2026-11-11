@echo off
rem AritmaCAD baslatici - DWG yardimcisini calistirir, Chrome ya da Edge'de uygulama penceresi olarak acar
setlocal
if exist "%~dp0app\dwg-yardimci.ps1" (
  start "AritmaCAD DWG" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0app\dwg-yardimci.ps1"
)
set "HTML=%~dp0index.html"
set "URL=file:///%HTML:\=/%"
set "CH1=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CH2=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "CH3=%LocalAppData%\Google\Chrome\Application\chrome.exe"
set "ED1=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "ED2=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
for %%B in ("%CH1%" "%CH2%" "%CH3%" "%ED1%" "%ED2%") do (
  if exist %%B (
    start "" %%B --app="%URL%" --start-maximized
    goto :eof
  )
)
rem Chrome/Edge bulunamadi: varsayilan tarayici
start "" "%HTML%"
