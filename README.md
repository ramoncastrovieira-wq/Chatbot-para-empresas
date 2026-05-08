TICO CRM - Autopeças

Setup rápido para demonstração:

1. Instalar dependências

```bash
npm install
```

2. Rodar o servidor

```bash
npm start
# ou em desenvolvimento com nodemon
npm run dev
```

Abra http://localhost:3000

Funcionalidades básicas:
- Cadastro de clientes
- Catálogo de peças (CRUD básico)

Arquitetura reorganizada:

src/
├── server/
│   ├── app.ts (placeholder)
│   └── server.ts (placeholder)
├── config/
│   ├── env.ts
│   └── database.js
├── modules/ (placeholders)
├── integrations/ (placeholders)
├── database/
│   ├── prisma/
│   └── migrations/
├── websocket/
├── shared/
│   ├── errors/
│   ├── utils/
│   ├── middlewares/
│   └── types/
└── jobs/

Observações:
- O código original do servidor foi movido para `src/server/server.js` (mantido em JS para não quebrar a execução imediata).
- Arquivos públicos foram movidos para `src/public/`.
- Para migrar totalmente para TypeScript, rode `npm install --save-dev typescript ts-node ts-node-dev @types/node @types/express` e converta os arquivos JS.
