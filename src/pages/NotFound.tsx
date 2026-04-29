import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <section className="not-found">
      <h1>404</h1>
      <p>That page doesn’t exist.</p>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </section>
  );
}
