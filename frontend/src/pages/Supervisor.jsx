import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';
import { queueShortName } from '../utils/format.js';

export default function Supervisor({ data, reload }) {
  const { daily } = data;

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <h2>Governança da operação</h2>
          <p>Controle de SLA, filas e fechamento diário.</p>
        </div>
        <button className="secondary" onClick={reload}>Atualizar</button>
      </div>

      {daily ? (
        <>
          <div className="stats-grid">
            <StatCard label="Total de conversas" value={daily.total} />
            <StatCard label="Aguardando" value={daily.waiting} tone="danger" />
            <StatCard label="Em atendimento" value={daily.in_progress} tone="warning" />
            <StatCard label="SLA vermelho" value={daily.sla_red} tone="danger" />
          </div>

          <section className="card">
            <h2>SLA por unidade</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Unidade</th>
                    <th>Aguardando</th>
                    <th>Em atendimento</th>
                    <th>Fechados hoje</th>
                    <th>Maior espera</th>
                    <th>SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {(daily.queues || []).map((row) => (
                    <tr key={row.queue_id}>
                      <td><strong>{queueShortName(row.queue)}</strong></td>
                      <td>{row.waiting}</td>
                      <td>{row.in_progress}</td>
                      <td>{row.closed_today}</td>
                      <td>{row.max_wait_minutes} min</td>
                      <td><Badge tone={row.sla === 'red' ? 'danger' : row.sla === 'yellow' ? 'warning' : 'success'}>{row.sla}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2>Checklist do supervisor</h2>
            <div className="checklist">
              <label><input type="checkbox" /> Conferir conversas aguardando há mais de 10 minutos</label>
              <label><input type="checkbox" /> Conferir unidade com SLA vermelho</label>
              <label><input type="checkbox" /> Verificar atendimentos sem responsável</label>
              <label><input type="checkbox" /> Conferir conversas finalizadas no dia</label>
              <label><input type="checkbox" /> Registrar observações da operação</label>
            </div>
          </section>
        </>
      ) : (
        <EmptyState title="Relatório indisponível">Verifique se a API está online.</EmptyState>
      )}
    </div>
  );
}
