@echo off
for %%I in ("%~dp0.") do set "REPO_ROOT=%%~fI"
cd /d "%REPO_ROOT%"

echo.
echo ========================================
echo   Scrumboy (Full Mode)
echo ========================================
echo.
echo Data will be stored in ./data/app.db
echo Mode: Full (multi-project)
echo.

REM ---- Free port 8080 ----
echo Stopping any existing server on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
  echo Killing process %%a...
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

REM ---- Optional HTTPS (mkcert + cert.pem/key.pem) ----
set USE_HTTPS=0
if exist "cert.pem" (
  if exist "key.pem" (
    set USE_HTTPS=1
    goto :show_urls
  )
)
where mkcert >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo mkcert not found - will use HTTP.
  echo To enable HTTPS for intranet: install mkcert, run mkcert -install, then:
  echo   mkcert -cert-file cert.pem -key-file key.pem 192.168.1.250 localhost
  echo.
  goto :show_urls
)
REM Write straight to cert.pem/key.pem. Wildcard rename breaks on Windows ^(see f.bat^).
echo Generating HTTPS certificates ^(or refreshing if one of cert.pem/key.pem is missing^)...
mkcert -cert-file cert.pem -key-file key.pem 192.168.1.250 localhost
if %ERRORLEVEL% neq 0 (
  echo WARNING: Certificate generation failed - will use HTTP
) else (
  if exist "cert.pem" if exist "key.pem" set USE_HTTPS=1
)
echo.

:show_urls
if %USE_HTTPS%==1 (
  echo Server URLs ^(HTTPS^):
  echo   Local:    https://127.0.0.1:8080/
  echo   Intranet: https://192.168.1.250:8080/
) else (
  echo Server URLs ^(HTTP^):
  echo   Local:    http://127.0.0.1:8080/
  echo   Intranet: http://192.168.1.250:8080/
)
echo.
echo Press Ctrl+C to stop the server.
echo.

REM ---- Configuration ----
set SCRUMBOY_MODE=full

REM Resolve SCRUMBOY_ENCRYPTION_KEY with precedence:
REM process env var -> data/scrumboy.env -> legacy root scrumboy.env
set "SCRUMBOY_KEY_TMP=%TEMP%\scrumboy-key-%RANDOM%-%RANDOM%.tmp"
powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\scripts\resolve_scrumboy_encryption_key.ps1" -OutputPath "%SCRUMBOY_KEY_TMP%" -RepoRoot "%REPO_ROOT%"
if errorlevel 1 (
  if exist "%SCRUMBOY_KEY_TMP%" del "%SCRUMBOY_KEY_TMP%" >nul 2>&1
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%SCRUMBOY_KEY_TMP%") do (
  if /I "%%A"=="SCRUMBOY_ENCRYPTION_KEY" set "SCRUMBOY_ENCRYPTION_KEY=%%B"
)
del "%SCRUMBOY_KEY_TMP%" >nul 2>&1

if not defined SCRUMBOY_ENCRYPTION_KEY (
  echo ERROR: failed to resolve SCRUMBOY_ENCRYPTION_KEY.
  exit /b 1
)

go run ./cmd/scrumboy
