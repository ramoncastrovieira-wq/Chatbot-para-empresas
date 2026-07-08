import { useState } from 'react';
import { api } from '../services/api.js';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { formatDate } from '../utils/format.js';

export default function Clientes({ data, reload }) {
  const { contacts = [] } = data;
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = contacts.filter((contact) => {
    const text = `${contact.name} ${contact.phone} ${contact.email || ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  async function saveContact(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/contacts', { ...form, email: form.email || null, metadata: {} });
      setModal(false);
      setForm({ name: '', phone: '', email: '' });
      reload();
    } catch (err) {
      setMessage(err.message || 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="toolbar">
        <div>
          <h2>Clientes</h2>
          <p>Base de contatos cadastrados no sistema interno.</p>
        </div>
        <button onClick={() => setModal(true)}>Novo cliente</button>
      </div>

      <div className="filter-row">
        <input placeholder="Buscar por nome, telefone ou e-mail" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      {filtered.length ? (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id}>
                  <td><strong>{contact.name}</strong></td>
                  <td>{contact.phone}</td>
                  <td>{contact.email || '-'}</td>
                  <td>{contact.is_active ? 'Ativo' : 'Inativo'}</td>
                  <td>{formatDate(contact.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Nenhum cliente encontrado" />
      )}

      {modal ? (
        <Modal title="Novo cliente" onClose={() => setModal(false)}>
          <form className="form-grid" onSubmit={saveContact}>
            <label>Nome</label>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <label>Telefone</label>
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
            <label>E-mail</label>
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            {message ? <div className="form-message">{message}</div> : null}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
