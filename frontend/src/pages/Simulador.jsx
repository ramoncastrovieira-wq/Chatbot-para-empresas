import { useState } from 'react';
import { api } from '../services/api.js';

export default function Simulador({ reload }) {
  const [form, setForm] = useState({
    name: 'Cliente teste',
    phone: `119${String(Date.now()).slice(-8)}`,
    content: 'Olá',
  });
  const [result, setResult] = useState('Aguardando simulação...');
  const [loading, setLoading] = useState(false);

  async function sendSimulation(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/demo-chatbot/send', form);
      setResult(JSON.stringify(response, null, 2));
      reload();
    } catch (err) {
      setResult(err.message || 'Erro na simulação');
    } finally {
      setLoading(false);
    }
  }

  async function resetContext() {
    if (!form.phone) return;
    setLoading(true);
    try {
      const response = await api.post(`/demo-chatbot/reset/${form.phone}`, {});
      setResult(JSON.stringify(response, null, 2));
    } catch (err) {
      setResult(err.message || 'Erro ao limpar contexto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid two">
      <section className="card">
        <h2>Simular mensagem recebida</h2>
        <p className="muted">Use para testar fila, conversa e histórico sem WhatsApp real.</p>
        <form className="form-grid" onSubmit={sendSimulation}>
          <label>Nome</label>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <label>Telefone fictício</label>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <label>Mensagem</label>
          <textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          <div className="toolbar-actions">
            <button disabled={loading}>{loading ? 'Enviando...' : 'Enviar simulação'}</button>
            <button type="button" className="secondary" onClick={resetContext} disabled={loading}>Limpar contexto</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Resultado</h2>
        <pre className="code-box">{result}</pre>
        <p className="hint">
          Fluxo sugerido: envie “Olá”, depois responda com 1, 2, 3 ou 4 para escolher a unidade,
          informe nome/categoria e abra a conversa no painel Atendimento.
        </p>
      </section>
    </div>
  );
}
