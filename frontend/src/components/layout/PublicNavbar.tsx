import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react';
import { Logo } from './Logo';
import { useApp } from '../../context/AppContext';

const pages = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme, role } = useApp();
  const dashboardPath = role ? `/${role}/dashboard` : '/login';

  return (
    <header className="cl-nav">
      <a className="cl-skip" href="#main-content">Skip to content</a>
      <div className="cl-nav__notice">CivicLink is a project prototype, not an official municipal service.</div>
      <div className="cl-wrap cl-nav__row">
        <Link to="/" className="cl-nav__brand" aria-label="CivicLink home" onClick={() => setMobileOpen(false)}>
          <Logo size="lg" className="cl-wordmark" />
          <span className="cl-nav__brand-tag">THE CIVIC PLATFORM</span>
        </Link>
        <nav className="cl-nav__links" aria-label="Primary navigation">
          {pages.map(({ label, to }) => (
            <NavLink key={to} end={to === '/'} to={to} className={({ isActive }) => isActive ? 'cl-nav__link cl-nav__link--active' : 'cl-nav__link'}>{label}</NavLink>
          ))}
          <a className="cl-nav__link" href="/#how-it-works">How it works</a>
        </nav>
        <div className="cl-nav__actions">
          <button type="button" className="cl-nav__theme" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link className="cl-nav__signin" to={dashboardPath}>{role ? 'Dashboard' : 'Sign in'}</Link>
          {!role && <Link className="cl-nav__cta" to="/register">Get started <ArrowUpRight size={17} aria-hidden="true" /></Link>}
          <button type="button" className="cl-nav__hamburger" onClick={() => setMobileOpen(v => !v)} aria-expanded={mobileOpen} aria-controls="cl-mobile-menu" aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav id="cl-mobile-menu" className="cl-nav__mobile" aria-label="Mobile navigation">
          {pages.map(({ label, to }) => <Link onClick={() => setMobileOpen(false)} to={to} key={to}>{label}</Link>)}
          <a onClick={() => setMobileOpen(false)} href="/#how-it-works">How it works</a>
          <Link onClick={() => setMobileOpen(false)} to={dashboardPath}>{role ? 'Dashboard' : 'Sign in'}</Link>
          {!role && <Link onClick={() => setMobileOpen(false)} to="/register">Get started →</Link>}
        </nav>
      )}
    </header>
  );
}
