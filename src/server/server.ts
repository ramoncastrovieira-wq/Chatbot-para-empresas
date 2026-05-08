import app from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => console.log(`(TS placeholder) Servidor rodando em http://localhost:${PORT}`));
