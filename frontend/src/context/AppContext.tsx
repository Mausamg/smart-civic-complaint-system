
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { Toast, User, UserRole } from '../types';
import type { LoginResponse } from '../services/authService';

type Theme = 'light' | 'dark';
type Lang = 'en' | 'ne';

interface AppContextValue {
  user: User | null;
  role: UserRole | null;
  accessToken: string | null;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<Lang>('en');
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      theme === 'dark'
    );
  }, [theme]);

  const login = useCallback((response: LoginResponse): UserRole => {
    const backendRoles = response.user.roles.map(
      (r) => r.toLowerCase()
    );

    const validRoles: UserRole[] = [
      'admin',
      'staff',
      'citizen',
    ];

    const authenticatedRole = validRoles.find(
      (r) => backendRoles.includes(r)
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

    setUser(authenticatedUser);
    setRole(authenticatedRole);
    setAccessToken(response.accessToken);

    return authenticatedRole;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRole(null);
    setAccessToken(null);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) =>
      current === 'light' ? 'dark' : 'light'
    );
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setToasts((previous) => [
      ...previous,
      { ...toast, id },
    ]);

    setTimeout(() => {
      setToasts((previous) =>
        previous.filter((item) => item.id !== id)
      );
    }, 5000);
  }, []);

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
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
}

