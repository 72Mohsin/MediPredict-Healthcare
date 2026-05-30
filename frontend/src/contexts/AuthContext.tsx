import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('medipredict_token');
    if (!token) { setIsLoading(false); return; }
    api.auth.me()
      .then(setUser)
      .catch(() => localStorage.removeItem('medipredict_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const { token, user } = await api.auth.login(username, password);
      localStorage.setItem('medipredict_token', token);
      setUser(user);
      return { error: null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  const signUp = async (username: string, password: string) => {
    try {
      const { token, user } = await api.auth.register(username, password);
      localStorage.setItem('medipredict_token', token);
      setUser(user);
      return { error: null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  const signOut = () => {
    localStorage.removeItem('medipredict_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
