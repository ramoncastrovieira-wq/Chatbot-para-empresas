import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { api } from './services/api.js';
import { canAccess, normalizeRole } from './utils/roles.js';
import Login from './pages/Login.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Atendimento from './pages/Atendimento.jsx';
import Supervisor from './pages/Supervisor.jsx';
import Clientes from './pages/Clientes.jsx';
import Unidades from './pages/Unidades.jsx';
import Admin from './pages/Admin.jsx';
import Simulador from './pages/Simulador.jsx';
import Configuracoes from './pages/Configuracoes.jsx';

function AppContent() {
  const { user } = useAuth();
  const [view, setView] = useState('dashboard');
  const [health, setHealth] = useState('offline');
  const [data, setData] = useState({
    summary: {},
    daily: null,
    operational: null,
    queues: [],
    contacts: [],
    conversations: [],
    attendants: [],
    users: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const role = normalizeRole(user?.role);

  const loadAll = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      await api.get('/health');
      setHealth('online');
      const [summary, daily, operational, queues, contacts, conversations, attendants, users] = await Promise.all([
        api.get('/dashboard/summary').catch(() => ({})),
        api.get('/reports/daily').catch(() => null),
        api.get('/operational/status').catch(() => null),
        api.get('/queues').catch(() => []),
        api.get('/contacts').catch(() => []),
        api.get('/conversations').catch(() => []),
        api.get('/attendants').catch(() => []),
        api.get('/users').catch(() => []),
      ]);
      setData({ summary, daily, operational, queues, contacts, conversations, attendants, users });
    } catch (err) {
      setHealth('offline');
      setError(err.message || 'Falha ao carregar dados');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!canAccess(view, role)) {
      setView(role === 'attendant' ? 'atendimento' : 'dashboard');
    }
  }, [user, role, view]);

  useEffect(() => {
    loadAll(false);
    const interval = setInterval(() => loadAll(true), 10000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const sharedProps = useMemo(() => ({ data, loading, error, reload: () => loadAll(false) }), [data, loading, error, loadAll]);

  if (!user) return <Login />;

  return (
    <AppLayout view={view} setView={setView} health={health}>
      {error ? <div className="alert error-alert">{error}</div> : null}
      {view === 'dashboard' && <Dashboard {...sharedProps} />}
      {view === 'atendimento' && <Atendimento {...sharedProps} />}
      {view === 'supervisor' && <Supervisor {...sharedProps} />}
      {view === 'clientes' && <Clientes {...sharedProps} />}
      {view === 'unidades' && <Unidades {...sharedProps} />}
      {view === 'admin' && <Admin {...sharedProps} />}
      {view === 'simulador' && <Simulador {...sharedProps} />}
      {view === 'configuracoes' && <Configuracoes health={health} reload={loadAll} />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
