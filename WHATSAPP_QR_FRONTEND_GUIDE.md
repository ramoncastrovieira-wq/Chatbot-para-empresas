# WhatsApp Web com QR Code no Frontend — Demo

Esta versão adiciona um gateway Node separado para gerar o QR Code do `whatsapp-web.js` e exibi-lo no frontend do projeto.

## O que foi adicionado

- `whatsapp_gateway/server.js`
- `whatsapp_gateway/package.json`
- Card de QR Code na aba **WhatsApp Demo** do frontend
- Endpoints locais:
  - `GET http://127.0.0.1:3001/api/wa/status`
  - `GET http://127.0.0.1:3001/api/wa/qr`
  - `POST http://127.0.0.1:3001/api/wa/restart`
  - `POST http://127.0.0.1:3001/api/wa/send`

## Como iniciar

### Terminal 1 — Docker

```powershell
docker compose up -d postgres redis
```

### Terminal 2 — Backend FastAPI

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn src_py.main:app --reload
```

### Terminal 3 — Worker

```powershell
docker compose up worker
```

### Terminal 4 — Frontend

```powershell
.\.venv\Scripts\python.exe -m http.server 5500 --directory frontend
```

### Terminal 5 — Gateway WhatsApp Web

```powershell
cd whatsapp_gateway
npm install
npm start
```

## Como usar

1. Abra `http://127.0.0.1:5500`
2. Clique na aba **WhatsApp Demo**
3. Aguarde o QR Code aparecer
4. No celular, abra WhatsApp → Aparelhos conectados → Conectar aparelho
5. Escaneie o QR Code exibido no frontend
6. Envie mensagem para o WhatsApp conectado
7. O gateway encaminha a mensagem para o backend FastAPI usando `/api/v1/demo-chatbot/send`

## Observação importante

Esta integração usa `whatsapp-web.js`, ou seja, é uma demo via WhatsApp Web. Para produção oficial, o caminho recomendado continua sendo Meta Cloud API.
