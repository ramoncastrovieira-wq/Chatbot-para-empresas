export function normalizeRole(role) {
  if (role === 'admin') return 'admin';
  if (role === 'attendant') return 'attendant';
  return 'supervisor';
}

export function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'attendant') return 'Atendente';
  return 'Supervisor';
}

export function canAccess(view, role) {
  const current = normalizeRole(role);
  const permissions = {
    admin: ['dashboard', 'atendimento', 'supervisor', 'clientes', 'unidades', 'admin', 'simulador', 'configuracoes'],
    supervisor: ['dashboard', 'atendimento', 'supervisor', 'clientes', 'unidades', 'simulador', 'configuracoes'],
    attendant: ['atendimento', 'clientes', 'simulador', 'configuracoes'],
  };
  return permissions[current].includes(view);
}

export function navItems(role) {
  const current = normalizeRole(role);
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'atendimento', label: 'Atendimento', icon: '💬' },
    { id: 'supervisor', label: 'Supervisor', icon: '📊' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    { id: 'unidades', label: 'Unidades', icon: '🏬' },
    { id: 'admin', label: 'Admin', icon: '🛠️' },
    { id: 'simulador', label: 'Simulador', icon: '🧪' },
    { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
  ];
  return items.filter((item) => canAccess(item.id, current));
}
