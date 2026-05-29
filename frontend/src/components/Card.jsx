export default function Card({ icon, title, description, gradient }) {
  return (
    <div className="service-card">
      <div className="card-content">
        <div className="card-icon">{icon}</div>
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{description}</p>
      </div>
      <div className="card-footer">
        <button className="btn-start">start</button>
        <a href="#" className="btn-more-info">more info</a>
      </div>
    </div>
  );
}
