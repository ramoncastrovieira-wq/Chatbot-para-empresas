# Frontend React — Hub Tico Auto Peças

Este frontend substitui gradualmente o painel estático antigo (`public/index.html`, `public/app.js`, `public/styles.css`) por uma aplicação React com Vite.

## Instalação local

```bash
cd frontend
npm install
npm run dev
```

Abra:

```text
http://localhost:5173
```

## Gerar build para o FastAPI servir

```bash
cd frontend
npm run build
```

O build será enviado para a pasta `../public`, que já é servida pelo `src_py/main.py`.

## Páginas migradas

- Login e criação de admin inicial
- Dashboard
- Atendimento / Conversas
- Supervisor / SLA
- Clientes
- Unidades / Filas
- Admin
- Simulador
- Configurações

## Observação

Leads e Google Sheets foram deixados fora desta versão, conforme solicitado.
