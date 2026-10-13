
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { getCurrentUser } from '../services/authService';
import type { LoginResponse } from '../services/authService';
import type { Toast, User, UserRole } from '../types';

type Theme = 'light' | 'dark';
type Lang = 'en' | 'ne';

const SESSION_KEY = 'civiclink.session';

interface StoredSession {
  accessToken: string;
  user: User;
}

interface AppContextValue {
  user: User | null;
  role: UserRole | null;
  accessToken: string | null;
  authLoading: boolean;
  login: (response: LoginResponse) => UserRole;
  logout: () => void;
  theme: Theme;
  toggleTheme: () => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function resolveRole(roles: string[]): UserRole | null {
  const normalized = roles.map((r) => r.toLowerCase());

  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('staff')) return 'staff';
  if (normalized.includes('citizen')) return 'citizen';

  return null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<Lang>('en');
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle(
        'dark',
        theme === 'dark'
    );
  }, [theme]);

  // Restore a session only after the backend validates its JWT.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const stored = sessionStorage.getItem(SESSION_KEY);

        if (!stored) return;

        const session = JSON.parse(stored) as StoredSession;

        if (!session?.accessToken || !session.user?.id) {
          throw new Error('Invalid stored session.');
        }

        const verified = await getCurrentUser(
            session.accessToken
        );

        const verifiedRole = resolveRole(verified.roles);

        if (
            !verifiedRole ||
            verified.userId !== session.user.id ||
            verified.email.toLowerCase() !==
            session.user.email.toLowerCase()
        ) {
          throw new Error('Session validation failed.');
        }

        if (cancelled) return;

        // The role comes from the backend, not browser storage.
        const restoredUser: User = {
          ...session.user,
          id: verified.userId,
          email: verified.email,
          role: verifiedRole,
        };

        setUser(restoredUser);
        setRole(verifiedRole);
        setAccessToken(session.accessToken);
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(SESSION_KEY);
          setUser(null);
          setRole(null);
          setAccessToken(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
      (response: LoginResponse): UserRole => {
        const authenticatedRole = resolveRole(
            response.user.roles
        );

        if (!authenticatedRole || !response.accessToken) {
          throw new Error('Invalid authentication response.');
        }

        const authenticatedUser: User = {
          id: response.user.id,
          name: `${response.user.firstName} ${response.user.lastName}`.trim(),
          email: response.user.email,
          phone: '',
          role: authenticatedRole,
        };

        const session: StoredSession = {
          accessToken: response.accessToken,
          user: authenticatedUser,
        };

        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );

        setUser(authenticatedUser);
        setRole(authenticatedRole);
        setAccessToken(response.accessToken);

        return authenticatedRole;
      },
      []
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setRole(null);
    setAccessToken(null);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) =>
        current === 'light' ? 'dark' : 'light'
    );
  }, []);

  const addToast = useCallback(
      (toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 7)}`;

        setToasts((previous) => [
          ...previous,
          { ...toast, id },
        ]);

        setTimeout(() => {
          setToasts((previous) =>
              previous.filter((item) => item.id !== id)
          );
        }, 5000);
      },
      []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((previous) =>
        previous.filter((item) => item.id !== id)
    );
  }, []);

  return (
      <AppContext.Provider
          value={{
            user,
            role,
            accessToken,
            authLoading,
            login,
            logout,
            theme,
            toggleTheme,
            lang,
            setLang,
            toasts,
            addToast,
            removeToast,
          }}
      >
        {children}
      </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
        'useApp must be used within AppProvider'
    );
  }

  return context;
}
