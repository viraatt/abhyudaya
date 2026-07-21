export default function StatCard({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div className="stat-title">{title}</div>

      <div className="stat-value">{value}</div>
    </div>
  );
}