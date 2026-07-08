import { useState } from 'react';
import { api } from '../services/api.js';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { queueShortName } from '../utils/format.js';

export default function Unidades({ data, reload }) {
  const { queues = [], conversations = [] } = data;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', priority: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function openCreate() {
    setForm({ name: '', description: '', priority: 0, is_active: true });
    setModal('queue');
  }

  function openEdit(queue) {
    setForm({ ...queue });
    setModal('queue');
  }

  async function saveQueue(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (form.id) {
        await api.patch(`/queues/${form.id}`, {
          name: form.name,
          description: form.description,
          priority: Number(form.priority || 0),
          is_active: Boolean(form.is_active),
        });
      } else {
        await api.post('/queues', {
          name: form.name,
          description: form.description,
          priority: Number(form.priority || 0),
        });
      }
      setModal(null);
      reload();
    } catch (err) {
      setMessage(err.message || 'Erro ao salvar fila');
    } finally {
      setSaving(false);
    }
  }

  async function seedQueues() {
    setSaving(true);
    setMessage('');
    try {
      await api.post('/setup/seed-queues', {});
      reload();
    } catch (err) {
      setMessage(err.message || 'Erro ao criar filas padrão');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <h2>Unidades e filas</h2>
          <p>Controle das filas internas por unidade.</p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary" onClick={seedQueues} disabled={saving}>Criar filas padrão</button>
          <button onClick={openCreate}>Nova fila</button>
        </div>
      </div>

      {message ? <div className="alert error-alert">{message}</div> : null}

      {queues.length ? (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Unidade/Fila</th>
                <th>Descrição</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Ativos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queues.map((queue) => {
                const active = conversations.filter((conv) => Number(conv.queue_id) === Number(queue.id) && conv.status !== 'closed');
                return (
                  <tr key={queue.id}>
                    <td><strong>{queueShortName(queue.name)}</strong></td>
                    <td>{queue.description || '-'}</td>
                    <td>{queue.priority}</td>
                    <td><Badge tone={queue.is_active ? 'success' : 'default'}>{queue.is_active ? 'Ativa' : 'Inativa'}</Badge></td>
                    <td>{active.length}</td>
                    <td className="right"><button className="secondary small" onClick={() => openEdit(queue)}>Editar</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhuma unidade cadastrada">Use o botão “Criar filas padrão”.</EmptyState>
      )}

      {modal === 'queue' ? (
        <Modal title={form.id ? 'Editar fila' : 'Nova fila'} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={saveQueue}>
            <label>Nome</label>
            <input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} required />

            <label>Descrição</label>
            <input value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />

            <label>Prioridade</label>
            <input type="number" value={form.priority || 0} onChange={(event) => setForm({ ...form, priority: event.target.value })} />

            {form.id ? (
              <label className="inline-check">
                <input type="checkbox" checked={Boolean(form.is_active)} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
                Fila ativa
              </label>
            ) : null}

            {message ? <div className="form-message">{message}</div> : null}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
