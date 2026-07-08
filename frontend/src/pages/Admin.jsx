import { useState } from 'react';
import { api } from '../services/api.js';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { roleLabel } from '../utils/roles.js';

export default function Admin({ data, reload }) {
  const { users = [], attendants = [], queues = [] } = data;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  function openUser(user = null) {
    setForm(user ? { ...user, password: '' } : { username: '', email: '', password: '123456', role: 'user' });
    setModal('user');
  }

  function openAttendant() {
    setForm({ user_id: users[0]?.id || '', name: '', description: '' });
    setModal('attendant');
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        username: form.username,
        email: form.email || null,
        role: form.role,
      };
      if (form.id) {
        await api.patch(`/users/${form.id}`, payload);
      } else {
        await api.post('/auth/register', { ...payload, password: form.password || '123456' });
      }
      setModal(null);
      reload();
    } catch (err) {
      setMessage(err.message || 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  }

  async function saveAttendant(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/attendants', {
        user_id: Number(form.user_id),
        name: form.name,
        description: form.description || null,
      });
      setModal(null);
      reload();
    } catch (err) {
      setMessage(err.message || 'Erro ao salvar atendente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="grid two">
        <section className="card">
          <div className="section-title">
            <h2>Usuários</h2>
            <button onClick={() => openUser()}>Novo usuário</button>
          </div>
          {users.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.username}</strong></td>
                      <td>{user.email || '-'}</td>
                      <td>{roleLabel(user.role)}</td>
                      <td><Badge tone={user.is_active ? 'success' : 'default'}>{user.is_active ? 'Ativo' : 'Inativo'}</Badge></td>
                      <td className="right"><button className="secondary small" onClick={() => openUser(user)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhum usuário" />
          )}
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Atendentes</h2>
            <button onClick={openAttendant}>Novo atendente</button>
          </div>
          {attendants.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Usuário</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendants.map((attendant) => (
                    <tr key={attendant.id}>
                      <td><strong>{attendant.name}</strong><br /><small>{attendant.description || '-'}</small></td>
                      <td>#{attendant.user_id}</td>
                      <td><Badge tone={attendant.is_active ? 'success' : 'default'}>{attendant.is_active ? 'Ativo' : 'Inativo'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Nenhum atendente" />
          )}
        </section>
      </div>

      <section className="card">
        <h2>Estrutura de filas</h2>
        <p className="muted">Filas cadastradas: {queues.length}</p>
      </section>

      {modal === 'user' ? (
        <Modal title={form.id ? 'Editar usuário' : 'Novo usuário'} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={saveUser}>
            <label>Usuário</label>
            <input value={form.username || ''} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
            <label>E-mail</label>
            <input value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            {!form.id ? (
              <>
                <label>Senha</label>
                <input type="password" value={form.password || ''} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </>
            ) : null}
            <label>Perfil</label>
            <select value={form.role || 'user'} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="admin">Admin</option>
              <option value="user">Supervisor</option>
              <option value="attendant">Atendente</option>
            </select>
            {message ? <div className="form-message">{message}</div> : null}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'attendant' ? (
        <Modal title="Novo atendente" onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={saveAttendant}>
            <label>Usuário vinculado</label>
            <select value={form.user_id || ''} onChange={(event) => setForm({ ...form, user_id: event.target.value })}>
              {users.map((user) => <option key={user.id} value={user.id}>#{user.id} {user.username} — {roleLabel(user.role)}</option>)}
            </select>
            <label>Nome do atendente</label>
            <input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <label>Descrição</label>
            <input value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
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
