# Deploy Checklist - Chatbot para Empresas (Python v2.0.0)

## ✅ Pre-Deploy Checklist

### Configuração
- [ ] `.env` criado com todas as variáveis necessárias
- [ ] DATABASE_URL configurada corretamente
- [ ] OPENAI_API_KEY configurada
- [ ] SECRET_KEY alterada (não use valor padrão)
- [ ] DEBUG=False em produção
- [ ] RELOAD=False em produção

### Código
- [ ] Todas as dependências instaladas (`pip install -r requirements.txt`)
- [ ] Testes passando (`pytest tests.py`)
- [ ] Sem erros de syntax (`python -m py_compile src_py/*.py`)
- [ ] Sem warnings críticos (`flake8 src_py/`)
- [ ] Tipos corretos (`mypy src_py/` - opcional)

### Banco de Dados
- [ ] PostgreSQL instalado e rodando
- [ ] Banco de dados criado
- [ ] Usuário e senha configurados
- [ ] Tabelas criadas (executar app uma vez)
- [ ] Backup feito (se migração de dados)

### API
- [ ] Health check OK (`GET /api/v1/health`)
- [ ] Docs Swagger acessível (`GET /docs`)
- [ ] Login funciona (`POST /api/v1/auth/login`)
- [ ] Criar contato funciona (`POST /api/v1/contacts`)
- [ ] Enviar mensagem funciona (`POST /api/v1/messages`)

### Segurança
- [ ] HTTPS/SSL configurado (se em produção)
- [ ] CORS whitelist específico (não use "*")
- [ ] Rate limiting implementado (considerar)
- [ ] Logs de acesso habilitados
- [ ] Senhas hasheadas verificadas

### Performance
- [ ] Queries otimizadas (sem N+1)
- [ ] Índices no banco confirmados
- [ ] Cache implementado (considerar Redis)
- [ ] Async/await usado corretamente
- [ ] Timeout adequados

---

## 🐳 Deploy com Docker

### Build
```bash
# Verificar Dockerfile existe
ls -la Dockerfile

# Build da imagem
docker build -t chatbot-python:2.0.0 .
docker images | grep chatbot

# Test locally
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e OPENAI_API_KEY="sk-..." \
  chatbot-python:2.0.0
```

### Com Docker Compose
```bash
# Setup
docker-compose up -d
docker-compose logs -f app

# Verificar saúde
docker-compose ps
curl http://localhost:8000/api/v1/health

# Limpar
docker-compose down
docker-compose down -v  # Remove volumes
```

### Checklist Docker
- [ ] Dockerfile criado
- [ ] docker-compose.yml criado
- [ ] Portas corretas mapeadas
- [ ] Volumes montados corretamente
- [ ] Health checks implementados
- [ ] Variáveis de ambiente passadas
- [ ] Imagem builds sem erros
- [ ] Container inicia corretamente

---

## 🌍 Deploy em Produção

### Plataformas Recomendadas

#### Option 1: Heroku
```bash
# Criar app
heroku create chatbot-app

# Provisionar PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Configurar variáveis
heroku config:set OPENAI_API_KEY="sk-..."
heroku config:set SECRET_KEY="seu-secret-key"
heroku config:set DEBUG=False

# Deploy
git push heroku main

# Logs
heroku logs --tail
```
- [ ] App criado no Heroku
- [ ] PostgreSQL provisioned
- [ ] Variáveis configuradas
- [ ] Build bem-sucedido
- [ ] Aplicação online

#### Option 2: Railway
```bash
# Conectar repositório
# Conectar PostgreSQL
# Configurar variáveis de ambiente
# Deploy automático
```
- [ ] Projeto criado
- [ ] GitHub integrado
- [ ] PostgreSQL adicionado
- [ ] Variáveis configuradas
- [ ] Deploy automático ativado

#### Option 3: DigitalOcean App Platform
```bash
# Via dashboard
# 1. Create App
# 2. Connect GitHub
# 3. Add PostgreSQL component
# 4. Set environment variables
# 5. Deploy
```
- [ ] App criado
- [ ] GitHub conectado
- [ ] PostgreSQL adicionado
- [ ] Variáveis de ambiente
- [ ] Domain configurado (HTTPS)

#### Option 4: AWS (ECS/EC2)
```bash
# ECR
aws ecr create-repository --repository-name chatbot-python
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com

# Build e push
docker build -t chatbot-python:2.0.0 .
docker tag chatbot-python:2.0.0 <account>.dkr.ecr.<region>.amazonaws.com/chatbot-python:2.0.0
docker push <account>.dkr.ecr.<region>.amazonaws.com/chatbot-python:2.0.0

# ECS
# 1. Create Task Definition (referenciando imagem ECR)
# 2. Create Service
# 3. Configure Load Balancer
# 4. Set environment variables
```
- [ ] ECR repository criado
- [ ] Imagem publicada
- [ ] Task definition criada
- [ ] ECS service rodando
- [ ] Load balancer funcionando

---

## 📊 Post-Deploy Verification

### Endpoints Críticos
- [ ] `GET /api/v1/health` - 200 OK
- [ ] `POST /api/v1/auth/register` - 201 Created
- [ ] `POST /api/v1/auth/login` - 200 OK
- [ ] `POST /api/v1/contacts` - 201 Created
- [ ] `GET /api/v1/contacts` - 200 OK
- [ ] `POST /api/v1/conversations` - 201 Created
- [ ] `POST /api/v1/messages` - 201 Created (com IA)
- [ ] `GET /docs` - Swagger UI funciona

### Database
- [ ] Conexão estável
- [ ] Queries rápidas (< 100ms)
- [ ] Backups automáticos ativados
- [ ] Monitoramento ativo

### API Documentation
- [ ] Swagger (/docs) acessível
- [ ] ReDoc (/redoc) acessível
- [ ] OpenAPI spec (/openapi.json) válido
- [ ] Documentação atualizada

### Logs & Monitoring
- [ ] Logs sendo coletados
- [ ] Alertas configurados
- [ ] Erro handling funcionando
- [ ] Performance sendo monitorada

### Security
- [ ] HTTPS/TLS verificado
- [ ] Certificado SSL válido
- [ ] Headers de segurança presentes
- [ ] Sem exposição de secrets

---

## 🔄 Rollback Plan

Se algo der errado:

```bash
# 1. Parar aplicação
docker stop chatbot_app
# ou: heroku maintenance:on

# 2. Restaurar versão anterior
docker run -p 8000:8000 chatbot-python:1.9.9  # versão anterior
# ou: git revert <commit>

# 3. Restaurar banco (se necessário)
pg_restore -d chatbot_db backup.sql

# 4. Verificar saúde
curl http://localhost:8000/api/v1/health

# 5. Ativar novamente
docker start chatbot_app
# ou: heroku maintenance:off
```

- [ ] Versão anterior taggeada
- [ ] Backup de banco feito
- [ ] Plano de rollback comunicado
- [ ] Runbook disponível

---

## 📞 Monitoramento Pós-Deploy

### 24h Verificação
- [ ] Sem erros críticos nos logs
- [ ] Response time médio < 500ms
- [ ] Taxa de erro < 0.1%
- [ ] Database connection pool saudável
- [ ] OpenAI API funcionando
- [ ] Sem timeouts de requisição

### 1 Semana Verificação
- [ ] Sem memory leaks
- [ ] Autoscaling funcionando (se aplicável)
- [ ] Backups automáticos OK
- [ ] Alertas de monitoramento OK
- [ ] Performance estável

### Métricas Importantes
- Latência P50, P95, P99
- Taxa de erro (5xx, 4xx)
- Taxa de sucesso de login
- Tempo de processamento de IA
- Uso de database connections
- Taxa de cache hit

---

## 🚀 Próximos Passos

### Curto Prazo (1-2 semanas)
- [ ] Monitoramento aprimorado (Prometheus)
- [ ] Testes de carga (LoadTesting)
- [ ] Configurar CDN (se necessário)
- [ ] Implementar cache (Redis)

### Médio Prazo (1 mês)
- [ ] WebSocket para real-time
- [ ] Integração com mais canais
- [ ] Dashboard de analytics
- [ ] Sistema de feedback

### Longo Prazo (2-3 meses)
- [ ] Multi-region deployment
- [ ] Disaster recovery plan
- [ ] Compliance (LGPD, GDPR)
- [ ] Otimização de custos

---

**Versão**: 2.0.0  
**Data**: 2024  
**Status**: ✅ Pronto para Deploy
