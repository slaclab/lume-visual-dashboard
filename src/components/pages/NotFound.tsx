import { Link } from '@tanstack/react-router';

function NotFound() {
  return (
    <div role="alert">
      <p>Page not found.</p>
      <Link to="/models">Back to models</Link>
    </div>
  );
}
export default NotFound;
