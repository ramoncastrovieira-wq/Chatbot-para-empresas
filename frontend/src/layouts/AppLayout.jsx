import { navItems, roleLabel, normalizeRole } from '../utils/roles.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function AppLayout({ view, setView, health, children }) {
  const { user, logout } = useAuth();
  const normalizedRole = normalizeRole(user?.role);
  const items = navItems(user?.role);

  function handleNav(id) {
    setView(id);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🔧</div>
          <div>
            <strong>Tico Auto Peças</strong>
            <span>Hub de atendimento</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => handleNav(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="profile-card">
          <small>Perfil atual</small>
          <strong>{roleLabel(user?.role)}</strong>
          <span>{user?.username}</span>
          <em>{normalizedRole === 'supervisor' ? 'Perfil backend: user' : 'Acesso validado'}</em>
        </div>

        <button className="ghost-button" onClick={logout}>Sair</button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <h1>{pageTitle(view)}</h1>
            <p>{pageSubtitle(view)}</p>
          </div>
          <div className="topbar-actions">
            <span className={`api-pill ${health === 'online' ? 'online' : 'offline'}`}>
              ● API {health === 'online' ? 'online' : 'offline'}
            </span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function pageTitle(view) {
  const map = {
    dashboard: 'Dashboard operacional',
    atendimento: 'Atendimento',
    supervisor: 'Supervisor',
    clientes: 'Clientes',
    unidades: 'Unidades e filas',
    admin: 'Administração',
    simulador: 'Simulador interno',
    configuracoes: 'Configurações',
  };
  return map[view] || 'Hub Tico Auto Peças';
}

function pageSubtitle(view) {
  const map = {
    dashboard: 'Visão geral do painel interno, filas e operação.',
    atendimento: 'Conversas, histórico e resposta pelo painel interno.',
    supervisor: 'SLA, relatório diário e controle da operação.',
    clientes: 'Cadastro e consulta de contatos do sistema.',
    unidades: 'Controle das filas por unidade da Tico.',
    admin: 'Usuários, atendentes e estrutura operacional.',
    simulador: 'Teste do fluxo sem WhatsApp real ou Evolution.',
    configuracoes: 'Ajustes locais do frontend e status da API.',
  };
  return map[view] || '';
}
