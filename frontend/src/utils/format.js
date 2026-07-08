export function formatDate(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function statusLabel(status) {
  const labels = {
    open: 'Aguardando atendimento',
    in_progress: 'Em atendimento',
    closed: 'Finalizado',
    waiting: 'Na fila',
    processing: 'Em atendimento',
    completed: 'Finalizado',
  };
  return labels[status] || status || 'Sem status';
}

export function statusTone(status) {
  if (status === 'closed' || status === 'completed') return 'success';
  if (status === 'in_progress' || status === 'processing') return 'warning';
  return 'danger';
}

export function queueShortName(name = '') {
  return String(name)
    .replace('Várzea Paulista - ', 'VP - ')
    .replace('Jd. América', 'Jd. América');
}
