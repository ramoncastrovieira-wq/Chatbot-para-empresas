@echo off
IF NOT EXIST .env copy .env.example .env
py -3.12 -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
echo.
echo Para subir o PostgreSQL com Docker: docker compose up -d postgres
echo Para iniciar a API: uvicorn src_py.main:app --reload
