export default function StatCard({ label, value, hint, tone = 'default' }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
