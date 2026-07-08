import { useState } from 'react';
import { api, storage } from '../services/api.js';
import Badge from '../components/Badge.jsx';

export default function Configuracoes({ health, reload }) {
  const [apiBase, setApiBase] = useState(storage.getApiBase());
  const [status, setStatus] = useState('');
  const productionWebhookPath = '8b6e6e59-8ec9-4958-a47b-742ee48ef11b';
  const cloudflareBase = 'https://n8n.agencialineuptico.com.br';

  function saveApiBase() {
    api.setBase(apiBase);
    setStatus('URL da API salva neste navegador.');
    reload(false);
  }

  return (
    <div className="page-stack">
      <section className="card">
        <div className="section-title">
          <h2>API do painel</h2>
          <Badge tone={health === 'online' ? 'success' : 'danger'}>{health}</Badge>
        </div>
        <label>URL da API</label>
        <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
        <button onClick={saveApiBase}>Salvar URL</button>
        {status ? <p className="form-message">{status}</p> : null}
        <p className="hint">Exemplo local: /api/v1 ou http://127.0.0.1:8000/api/v1.</p>
      </section>

      <section className="card">
        <h2>URL final do webhook n8n</h2>
        <p className="muted">Quando o domínio Cloudflare estiver ativo, use esta URL no Typebot.</p>
        <pre className="code-box">{`${cloudflareBase}/webhook/${productionWebhookPath}`}</pre>
        <p className="hint">Enquanto o domínio não ativa, mantenha o ngrok no Typebot.</p>
      </section>

      <section className="card">
        <h2>Ambiente recomendado</h2>
        <div className="status-list">
          <span>Produção</span><Badge tone="success">Tico Leads - Produção</Badge>
          <span>Teste</span><Badge tone="warning">Tico Leads - Teste</Badge>
          <span>Alerta</span><Badge tone="success">Tico Leads - Alerta de Erro</Badge>
          <span>Frontend React</span><Badge>Vite</Badge>
        </div>
      </section>
    </div>
  );
}
