import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { useLocation } from 'wouter';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) {
      setLocation('/login');
    }
  }, [token, setLocation]);

  if (!token) {
    return null;
  }

  return <>{children}</>;
}
