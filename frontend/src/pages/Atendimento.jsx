import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDate, statusLabel, statusTone, queueShortName } from '../utils/format.js';

export default function Atendimento({ data, reload }) {
  const { conversations = [], contacts = [], queues = [], attendants = [] } = data;
  const [selectedId, setSelectedId] = useState(conversations[0]?.id || null);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => Number(conversation.id) === Number(selectedId)),
    [conversations, selectedId]
  );

  useEffect(() => {
    if (!selectedId && conversations.length) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    loadConversation(selectedId);
  }, [selectedId]);

  function getContact(id) {
    return contacts.find((contact) => Number(contact.id) === Number(id));
  }

  function getQueue(id) {
    return queues.find((queue) => Number(queue.id) === Number(id));
  }

  async function loadConversation(id) {
    setLoadingDetail(true);
    setError('');
    try {
      const detailData = await api.get(`/conversations/${id}`);
      const messageData = await api.get(`/conversations/${id}/messages`);
      setDetail(detailData);
      setMessages(messageData || []);
    } catch (err) {
      setError(err.message || 'Erro ao abrir conversa');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function assignConversation() {
    const attendant = attendants[0];
    if (!selectedId || !attendant) {
      setError('Nenhum atendente disponível para assumir.');
      return;
    }
    try {
      await api.post(`/conversations/${selectedId}/assign/${attendant.id}`, {});
      await reload();
      await loadConversation(selectedId);
    } catch (err) {
      setError(err.message || 'Erro ao assumir conversa');
    }
  }

  async function closeConversation() {
    if (!selectedId) return;
    try {
      await api.post(`/conversations/${selectedId}/close`, {});
      await reload();
      await loadConversation(selectedId);
    } catch (err) {
      setError(err.message || 'Erro ao finalizar conversa');
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim() || !selectedConversation) return;
    try {
      await api.post('/panel/send-message', {
        conversation_id: selectedConversation.id,
        contact_id: selectedConversation.contact_id,
        content: reply.trim(),
        sender_type: 'attendant',
        message_type: 'text',
        metadata: {},
      });
      setReply('');
      await loadConversation(selectedConversation.id);
      await reload();
    } catch (err) {
      setError(err.message || 'Erro ao enviar mensagem');
    }
  }

  return (
    <div className="attendance-layout">
      <section className="conversation-list card">
        <div className="section-title">
          <h2>Conversas</h2>
          <Badge>{conversations.length}</Badge>
        </div>
        {conversations.length ? (
          <div className="conversation-items">
            {conversations.map((conversation) => {
              const contact = getContact(conversation.contact_id);
              const queue = getQueue(conversation.queue_id);
              return (
                <button
                  key={conversation.id}
                  className={`conversation-item ${selectedId === conversation.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(conversation.id)}
                >
                  <strong>{contact?.name || conversation.title || `Cliente #${conversation.contact_id}`}</strong>
                  <span>{contact?.phone || '-'}</span>
                  <small>{queue ? queueShortName(queue.name) : 'Sem fila'} · {statusLabel(conversation.status)}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Nenhuma conversa" />
        )}
      </section>

      <section className="chat-panel card">
        {selectedConversation ? (
          <>
            <div className="chat-head">
              <div>
                <h2>{getContact(selectedConversation.contact_id)?.name || `Conversa #${selectedConversation.id}`}</h2>
                <p>{getContact(selectedConversation.contact_id)?.phone || '-'} · {queueShortName(getQueue(selectedConversation.queue_id)?.name || 'Sem fila')}</p>
              </div>
              <div className="chat-actions">
                <Badge tone={statusTone(selectedConversation.status)}>{statusLabel(selectedConversation.status)}</Badge>
                <button className="secondary small" onClick={assignConversation}>Assumir</button>
                <button className="secondary small" onClick={closeConversation}>Finalizar</button>
              </div>
            </div>

            {error ? <div className="alert error-alert">{error}</div> : null}

            <div className="message-list">
              {loadingDetail ? (
                <EmptyState title="Carregando conversa" />
              ) : messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className={`message-bubble ${message.sender_type === 'user' ? 'incoming' : 'outgoing'}`}>
                    <p>{message.content}</p>
                    <span>{message.sender_type} · {formatDate(message.created_at)}</span>
                  </div>
                ))
              ) : (
                <EmptyState title="Sem mensagens" />
              )}
            </div>

            <form className="composer" onSubmit={sendReply}>
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Digite uma resposta interna..."
              />
              <button>Enviar</button>
            </form>
          </>
        ) : (
          <EmptyState title="Selecione uma conversa" />
        )}
      </section>
    </div>
  );
}
