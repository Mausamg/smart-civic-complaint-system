import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, Sun, Moon, ChevronDown, LogIn, UserPlus, Globe } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/format';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Report Issue', to: '/report' },
  { label: 'Track Complaint', to: '/track' },
  { label: 'Public Map', to: '/map' },
  { label: 'About', to: '/about' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { theme, toggleTheme, lang, setLang, role } = useApp();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="shrink-0" aria-label="CivicLink home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800'
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
              aria-haspopup="true"
              aria-expanded={langOpen}
            >
              <Globe className="h-4 w-4" />
              {lang === 'en' ? 'EN' : 'ने'}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1 w-32 rounded-xl border border-ink-200 bg-white p-1 shadow-float dark:border-ink-700 dark:bg-ink-900">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'ne', label: 'नेपाली' },
                ].map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code as 'en' | 'ne');
                      setLangOpen(false);
                    }}
                    className={cn(
                      'block w-full rounded-lg px-3 py-1.5 text-left text-sm',
                      lang === l.code ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40' : 'hover:bg-ink-100 dark:hover:bg-ink-800'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {role ? (
            <Button size="sm" leftIcon={<Bell className="h-4 w-4" />} onClick={() => navigate('/citizen/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="outline" size="sm" leftIcon={<LogIn className="h-4 w-4" />} onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button size="sm" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => navigate('/register')}>
                Register
              </Button>
            </div>
          )}

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-200 bg-white lg:hidden dark:border-ink-800 dark:bg-ink-950">
          <nav className="container-page flex flex-col gap-1 py-3" aria-label="Mobile">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-ink-700 hover:bg-ink-100'
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            {!role && (
              <div className="mt-2 flex gap-2 border-t border-ink-100 pt-3">
                <Button variant="outline" fullWidth leftIcon={<LogIn className="h-4 w-4" />} onClick={() => { navigate('/login'); setMobileOpen(false); }}>
                  Login
                </Button>
                <Button fullWidth leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => { navigate('/register'); setMobileOpen(false); }}>
                  Register
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
