# Execute no PowerShell dentro da pasta do projeto.
# Necessário: Python 3.12 instalado e Docker Desktop opcional para PostgreSQL.

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Arquivo .env criado a partir do .env.example. Confira DATABASE_URL e SECRET_KEY." -ForegroundColor Yellow
}

py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

Write-Host "\nPara subir o PostgreSQL com Docker:" -ForegroundColor Cyan
Write-Host "docker compose up -d postgres"
Write-Host "\nPara iniciar a API:" -ForegroundColor Cyan
Write-Host "uvicorn src_py.main:app --reload"
