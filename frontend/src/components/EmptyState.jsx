export default function EmptyState({ title = 'Nenhum registro encontrado', children }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
