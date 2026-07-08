import StatCard from '../components/StatCard.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Loading from '../components/Loading.jsx';
import { queueShortName } from '../utils/format.js';

export default function Dashboard({ data, loading, reload }) {
  const { summary = {}, daily, queues = [], conversations = [] } = data;

  if (loading) return <Loading />;

  return (
    <div className="page-stack">
      <div className="toolbar">
        <h2>Resumo do sistema</h2>
        <button className="secondary" onClick={reload}>Atualizar</button>
      </div>

      <div className="stats-grid">
        <StatCard label="Clientes" value={summary.contacts} />
        <StatCard label="Conversas abertas" value={summary.open_conversations} tone="danger" />
        <StatCard label="Em atendimento" value={summary.in_progress_conversations} tone="warning" />
        <StatCard label="Mensagens" value={summary.messages} />
      </div>

      <div className="grid two">
        <section className="card">
          <div className="section-title">
            <h2>Relatório diário</h2>
            <Badge tone={daily?.sla_red ? 'danger' : 'success'}>SLA {daily?.sla_red ? 'atenção' : 'ok'}</Badge>
          </div>
          {daily ? (
            <div className="daily-grid">
              <StatCard label="Total" value={daily.total} />
              <StatCard label="Aguardando" value={daily.waiting} tone="danger" />
              <StatCard label="Em atendimento" value={daily.in_progress} tone="warning" />
              <StatCard label="Fechados hoje" value={daily.closed_today} tone="success" />
            </div>
          ) : (
            <EmptyState title="Relatório diário indisponível" />
          )}
        </section>

        <section className="card">
          <h2>Status operacional</h2>
          <p className="muted">
            O painel está preparado para validar filas, atendentes, histórico e governança em modo interno.
          </p>
          <div className="status-list">
            <span>API FastAPI</span><Badge tone="success">conectada</Badge>
            <span>Mensageria externa</span><Badge tone="warning">simulador interno</Badge>
            <span>Fila ativa</span><Badge>{summary.queues ?? queues.length}</Badge>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Filas por unidade</h2>
          <span className="muted">Conversas abertas e em atendimento por fila</span>
        </div>
        {queues.length ? (
          <div className="queue-grid">
            {queues.map((queue) => {
              const active = conversations.filter((conv) => Number(conv.queue_id) === Number(queue.id) && conv.status !== 'closed');
              const waiting = active.filter((conv) => conv.status === 'open');
              return (
                <div className="queue-card" key={queue.id}>
                  <h3>{queueShortName(queue.name)}</h3>
                  <p>{queue.description || 'Sem descrição'}</p>
                  <div className="queue-card-row">
                    <Badge tone="danger">{waiting.length} aguardando</Badge>
                    <Badge tone="warning">{active.length} ativos</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Nenhuma fila cadastrada" />
        )}
      </section>
    </div>
  );
}
