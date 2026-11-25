export function ModulePlaceholder({ title, description }) {
  return (
    <section className="sn-card">
      <h1>{title}</h1>
      <p className="sn-muted">{description}</p>
      <p>Este módulo se conectará a la API existente en una fase posterior.</p>
    </section>
  );
}
