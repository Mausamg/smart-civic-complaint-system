import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate, Link, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus2, ListTodo, Map as MapIcon, FileEdit, Bell, Megaphone,
  MessageSquare, User, Settings, HelpCircle, LogOut, Menu, X, Sun, Moon, Search,
  ChevronDown, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { Logo } from './Logo';
import { useApp } from '@/context/AppContext';
import { notifications as allNotifications } from '@/data/mockData';
import { cn } from '@/utils/format';
import { timeAgo } from '@/utils/format';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  badge?: number;
}

const navByRole: Record<UserRole, { section: string; items: NavItem[] }[]> = {
  citizen: [
    {
      section: 'Main',
      items: [
        { label: 'Dashboard', to: '/citizen/dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
        { label: 'Report Complaint', to: '/citizen/report', icon: <FilePlus2 className="h-[18px] w-[18px]" /> },
        { label: 'My Complaints', to: '/citizen/complaints', icon: <ListTodo className="h-[18px] w-[18px]" /> },
        { label: 'Complaint Map', to: '/citizen/map', icon: <MapIcon className="h-[18px] w-[18px]" /> },
        { label: 'Saved Drafts', to: '/citizen/drafts', icon: <FileEdit className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      section: 'Activity',
      items: [
        { label: 'Notifications', to: '/citizen/notifications', icon: <Bell className="h-[18px] w-[18px]" />, badge: 4 },
        { label: 'Announcements', to: '/citizen/announcements', icon: <Megaphone className="h-[18px] w-[18px]" /> },
        { label: 'Feedback', to: '/citizen/feedback', icon: <MessageSquare className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      section: 'Account',
      items: [
        { label: 'Profile', to: '/citizen/profile', icon: <User className="h-[18px] w-[18px]" /> },
        { label: 'Settings', to: '/citizen/settings', icon: <Settings className="h-[18px] w-[18px]" /> },
        { label: 'Help & Support', to: '/citizen/help', icon: <HelpCircle className="h-[18px] w-[18px]" /> },
      ],
    },
  ],
  staff: [
    {
      section: 'Main',
      items: [
        { label: 'Dashboard', to: '/staff/dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
        { label: 'Assigned Complaints', to: '/staff/assigned', icon: <ListTodo className="h-[18px] w-[18px]" /> },
        { label: 'Complaint Queue', to: '/staff/queue', icon: <FilePlus2 className="h-[18px] w-[18px]" /> },
        { label: 'Map View', to: '/staff/map', icon: <MapIcon className="h-[18px] w-[18px]" /> },
        { label: 'Calendar', to: '/staff/calendar', icon: <FileEdit className="h-[18px] w-[18px]" /> },
        { label: 'Messages', to: '/staff/messages', icon: <MessageSquare className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      section: 'Activity',
      items: [
        { label: 'Notifications', to: '/staff/notifications', icon: <Bell className="h-[18px] w-[18px]" />, badge: 4 },
        { label: 'Reports', to: '/staff/reports', icon: <FileEdit className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      section: 'Account',
      items: [
        { label: 'Profile', to: '/staff/profile', icon: <User className="h-[18px] w-[18px]" /> },
        { label: 'Settings', to: '/staff/settings', icon: <Settings className="h-[18px] w-[18px]" /> },
      ],
    },
  ],
  admin: [
    {
      section: 'Main',
      items: [
        { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
        { label: 'Complaints', to: '/admin/complaints', icon: <ListTodo className="h-[18px] w-[18px]" /> },
        { label: 'Assignment', to: '/admin/assignment', icon: <FilePlus2 className="h-[18px] w-[18px]" /> },
        { label: 'Public Map', to: '/admin/map', icon: <MapIcon className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      section: 'Management',
      items: [
        { label: 'Departments', to: '/admin/departments', icon: <ShieldCheck className="h-[18px] w-[18px]" /> },
        { label: 'Staff', to: '/admin/staff', icon: <User className="h-[18px] w-[18px]" /> },
        { label: 'Announcements', to: '/admin/announcements', icon: <Megaphone className="h-[18px] w-[18px]" /> },
        { label: 'Analytics', to: '/admin/analytics', icon: <FileEdit className="h-[18px] w-[18px]" /> },
        { label: 'Escalations', to: '/admin/escalations', icon: <AlertTriangle className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      section: 'System',
      items: [
        { label: 'Settings', to: '/admin/settings', icon: <Settings className="h-[18px] w-[18px]" /> },
        { label: 'Help & Support', to: '/admin/help', icon: <HelpCircle className="h-[18px] w-[18px]" /> },
      ],
    },
  ],
};

const roleLabel: Record<UserRole, string> = {
  citizen: 'Citizen Portal',
  staff: 'Staff Console',
  admin: 'Admin Console',
};

const mobileNavByRole: Record<UserRole, NavItem[]> = {
  citizen: [
    { label: 'Home', to: '/citizen/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Report', to: '/citizen/report', icon: <FilePlus2 className="h-5 w-5" /> },
    { label: 'Complaints', to: '/citizen/complaints', icon: <ListTodo className="h-5 w-5" /> },
    { label: 'Map', to: '/citizen/map', icon: <MapIcon className="h-5 w-5" /> },
    { label: 'Alerts', to: '/citizen/notifications', icon: <Bell className="h-5 w-5" /> },
  ],
  staff: [
    { label: 'Home', to: '/staff/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Assigned', to: '/staff/assigned', icon: <ListTodo className="h-5 w-5" /> },
    { label: 'Queue', to: '/staff/queue', icon: <FilePlus2 className="h-5 w-5" /> },
    { label: 'Map', to: '/staff/map', icon: <MapIcon className="h-5 w-5" /> },
    { label: 'Alerts', to: '/staff/notifications', icon: <Bell className="h-5 w-5" /> },
  ],
  admin: [
    { label: 'Home', to: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Complaints', to: '/admin/complaints', icon: <ListTodo className="h-5 w-5" /> },
    { label: 'Assign', to: '/admin/assignment', icon: <FilePlus2 className="h-5 w-5" /> },
    { label: 'Dept', to: '/admin/departments', icon: <ShieldCheck className="h-5 w-5" /> },
    { label: 'Alerts', to: '/admin/notifications', icon: <Bell className="h-5 w-5" /> },
  ],
};

export function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, role, logout, theme, toggleTheme } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!role || !user) return null;
  const sections = navByRole[role];
  const mobileNav = mobileNavByRole[role];
  const unread = allNotifications.filter((n) => !n.read).length;
  const notifPrefix = `/${role}`;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink-200 bg-white lg:flex lg:flex-col dark:border-ink-800 dark:bg-ink-900">
        <div className="flex h-16 items-center border-b border-ink-100 px-5 dark:border-ink-800">
          <Link to="/" aria-label="Home">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">{roleLabel[role]}</p>
          {sections.map((s) => (
            <div key={s.section} className="mb-4">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{s.section}</p>
              <nav className="space-y-0.5">
                {s.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                        isActive
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                          : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800'
                      )
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="border-t border-ink-100 p-3 dark:border-ink-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-error-600 transition hover:bg-error-50 dark:hover:bg-error-950/40"
          >
            <LogOut className="h-[18px] w-[18px]" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-float dark:bg-ink-900 flex flex-col animate-slide-in-right">
            <div className="flex h-16 items-center justify-between border-b border-ink-100 px-5 dark:border-ink-800">
              <Logo />
              <button onClick={() => setMobileNavOpen(false)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
              {sections.map((s) => (
                <div key={s.section} className="mb-4">
                  <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{s.section}</p>
                  {s.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileNavOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                          isActive ? 'bg-primary-50 text-primary-700' : 'text-ink-600 hover:bg-ink-100'
                        )
                      }
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {item.badge && <span className="rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white">{item.badge}</span>}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
            <div className="border-t border-ink-100 p-3 dark:border-ink-800">
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50">
                <LogOut className="h-[18px] w-[18px]" /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 dark:border-ink-800 dark:bg-ink-900/90">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 max-w-md sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              placeholder="Search complaints, tracking ID…"
              className="input-base h-9 pl-10"
              aria-label="Search"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white dark:ring-ink-900" />}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} aria-hidden />
                  <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-ink-200 bg-white shadow-float dark:border-ink-700 dark:bg-ink-900">
                    <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">Notifications</p>
                      <span className="rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white">{unread} new</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto scrollbar-thin">
                      {allNotifications.slice(0, 5).map((n) => (
                        <Link
                          key={n.id}
                          to={n.link || '#'}
                          onClick={() => setNotifOpen(false)}
                          className={cn('flex gap-3 border-b border-ink-50 px-4 py-3 last:border-0 hover:bg-ink-50 dark:border-ink-800/50 dark:hover:bg-ink-800/50', !n.read && 'bg-primary-50/40 dark:bg-primary-950/20')}
                        >
                          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                          <div className={cn('min-w-0', n.read && 'pl-5')}>
                            <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.message}</p>
                            <p className="mt-1 text-[10px] text-ink-400">{timeAgo(n.timestamp)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link to={`${notifPrefix}/notifications`} onClick={() => setNotifOpen(false)} className="block border-t border-ink-100 px-4 py-2.5 text-center text-xs font-medium text-primary-600 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800">
                      View all notifications
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex h-9 items-center gap-2 rounded-lg pl-1.5 pr-2 hover:bg-ink-100 dark:hover:bg-ink-800"
                aria-haspopup="true"
                aria-expanded={profileOpen}
              >
                <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                <span className="hidden text-sm font-medium text-ink-700 sm:block dark:text-ink-200">{user.name.split(' ')[0]}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-ink-400 sm:block" />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} aria-hidden />
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-ink-200 bg-white p-1.5 shadow-float dark:border-ink-700 dark:bg-ink-900">
                    <div className="border-b border-ink-100 px-3 py-2.5 dark:border-ink-800">
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{user.name}</p>
                      <p className="truncate text-xs text-ink-500">{user.email}</p>
                      <span className="mt-1.5 inline-block rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">{role}</span>
                    </div>
                    <Link to={`${notifPrefix}/profile`} onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">My Profile</Link>
                    <Link to={`${notifPrefix}/settings`} onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800">Settings</Link>
                    <button onClick={handleLogout} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-950/40">Logout</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-8" key={location.pathname}>
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-ink-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-ink-800 dark:bg-ink-900/95" aria-label="Mobile bottom navigation">
        {mobileNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition',
                isActive ? 'text-primary-600' : 'text-ink-400'
              )
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
