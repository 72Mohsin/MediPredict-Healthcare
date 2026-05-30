import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-8xl font-bold text-muted-foreground">404</h1>
      <h2 className="mb-4 text-2xl font-semibold">Page Not Found</h2>
      <p className="mb-8 text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button asChild><Link to="/">Go Home</Link></Button>
    </div>
  );
}
