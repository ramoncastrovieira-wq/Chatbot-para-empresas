# Alterações — Frontend público com WhatsApp Gateway

- Removida a pasta `frontend/`, que causava confusão com o painel servido pelo backend.
- Mantido apenas o frontend oficial em `public/`.
- Adicionada a aba **WhatsApp** no menu lateral do painel principal.
- A aba WhatsApp agora permite:
  - ver o status do gateway;
  - configurar a URL do gateway;
  - exibir o QR Code;
  - reiniciar a sessão do WhatsApp;
  - enviar uma mensagem de teste.
- Atualizado o hint do gateway para apontar para `http://127.0.0.1:8000`.

## Como usar

1. Inicie o backend:

```powershell
uvicorn src_py.main:app --reload
```

2. Inicie o gateway:

```powershell
cd whatsapp_gateway
npm install
npm start
```

3. Abra:

```text
http://127.0.0.1:8000
```

4. Entre no sistema e clique na aba **WhatsApp**.
