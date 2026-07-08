import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { apiBase, login, createAdmin } = useAuth();
  const [base, setBase] = useState(apiBase || '/api/v1');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await login(username, password, base);
    } catch (err) {
      setMessage(err.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAdmin() {
    setLoading(true);
    setMessage('');
    try {
      await createAdmin(username, password, base);
      setMessage('Admin criado. Agora clique em Entrar.');
    } catch (err) {
      setMessage(err.message || 'Erro ao criar admin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <section className="login-hero">
          <div className="brand big">
            <div className="brand-icon">🔧</div>
            <div>
              <strong>Hub WhatsApp Tico Auto Peças</strong>
              <span>Painel operacional em React</span>
            </div>
          </div>
          <h1>Atendimento interno, filas e operação em um só painel.</h1>
          <p>
            Versão React migrada a partir do frontend estático. Mantém a API FastAPI atual,
            sem mexer no fluxo externo do Typebot/n8n.
          </p>
          <ul>
            <li>Perfis: Admin, Supervisor e Atendente</li>
            <li>Dashboard, conversas, filas, clientes e simulador</li>
            <li>Sem dependência de leads/planilha nesta etapa</li>
          </ul>
        </section>

        <form className="login-form" onSubmit={handleLogin}>
          <h2>Entrar no sistema</h2>
          <label>URL da API</label>
          <input value={base} onChange={(event) => setBase(event.target.value)} />

          <label>Usuário</label>
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" />

          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="123456"
          />

          <button disabled={loading}>{loading ? 'Aguarde...' : 'Entrar'}</button>
          <button type="button" className="secondary" onClick={handleCreateAdmin} disabled={loading}>
            Criar admin inicial
          </button>
          <p className="hint">Supervisor usa o perfil interno <b>user</b> por compatibilidade com o backend atual.</p>
          {message ? <div className="form-message">{message}</div> : null}
        </form>
      </div>
    </div>
  );
}
