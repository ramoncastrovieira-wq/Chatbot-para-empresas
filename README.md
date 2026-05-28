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

Usando PostgreSQL
 - Defina a variável de ambiente `DATABASE_URL` com a connection string do seu banco Postgres, por exemplo:
	 - Unix/macOS: `export DATABASE_URL=postgresql://user:password@localhost:5432/chatbot`
	 - Windows PowerShell: `$env:DATABASE_URL = "postgresql://user:password@localhost:5432/chatbot"`
 - O adaptador foi migrado para Postgres em `src/config/database.js`. Ao iniciar o servidor ele tentará criar as tabelas se não existirem.
 - Instale dependências e rode o servidor:

```powershell
npm install
npm start
```

Notas:
 - Se preferir, instale localmente o PostgreSQL (ou use um container) antes de iniciar o servidor.
 - Se quiser que eu configure um arquivo `.env` ou rode a instalação agora, me avise.

Autenticação (JWT)

- Endpoints disponíveis:
	- `POST /api/register` — corpo JSON `{ "username": "user", "password": "pass", "role": "user" }` cria um usuário.
	- `POST /api/login` — corpo JSON `{ "username": "user", "password": "pass" }` retorna `{ ok: true, token, user }` em caso de sucesso.
	- `GET /api/me` — requer header `Authorization: Bearer <token>` para obter dados do usuário autenticado.

Exemplo (PowerShell/curl):

```powershell
curl -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' http://localhost:3000/api/register
curl -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' http://localhost:3000/api/login
```

Observação: o front-end atual envia `POST /api/login` para o fluxo de login — o endpoint mantém compatibilidade e agora retorna também um `token` JWT.
