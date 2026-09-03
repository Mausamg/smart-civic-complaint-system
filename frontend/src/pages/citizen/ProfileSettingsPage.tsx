import { useState } from 'react';
import { User, Lock, Bell, Globe, ShieldCheck, Palette, Download, Trash2, LogOut, Camera, Eye, EyeOff, Accessibility } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Checkbox } from '@/components/ui/Form';
import { Tabs } from '@/components/ui/Tabs';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { cn } from '@/utils/format';

export function ProfileSettingsPage({ linkPrefix = '/citizen' }: { linkPrefix?: string }) {
  const { user, theme, toggleTheme, lang, setLang, addToast } = useApp();
  const [showDelete, setShowDelete] = useState(false);
  const [prefs, setPrefs] = useState({ email: true, sms: false, push: true, inApp: true });
  const [a11y, setA11y] = useState({ reducedMotion: false, largeText: false, colorblind: false });

  if (!user) return null;

  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-4 w-4" />,
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={user.avatar} alt="" className="h-20 w-20 rounded-2xl object-cover" />
              <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm hover:bg-primary-700" aria-label="Change photo">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">{user.name}</h3>
              <p className="text-sm text-ink-500">{user.email}</p>
              <span className="mt-1 inline-block rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">{user.role}</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" defaultValue={user.name} />
            <Input label="Email" type="email" defaultValue={user.email} />
            <Input label="Phone" defaultValue={user.phone} />
            <Input label="Address" defaultValue={user.address || ''} />
            <Select label="Municipality" defaultValue={user.municipality} options={[
              { value: 'Kathmandu Metropolitan City', label: 'Kathmandu Metropolitan City' },
              { value: 'Lalitpur Metropolitan City', label: 'Lalitpur Metropolitan City' },
            ]} />
            <Select label="Ward" defaultValue={user.ward} options={Array.from({ length: 32 }, (_, i) => ({ value: `Ward ${i + 1}`, label: `Ward ${i + 1}` }))} />
          </div>
          <div className="flex justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
            <Button variant="outline">Cancel</Button>
            <Button onClick={() => addToast({ type: 'success', title: 'Profile updated' })}>Save changes</Button>
          </div>
        </div>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Lock className="h-4 w-4" />,
      content: (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Change password</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Input label="Current password" isPassword placeholder="••••••••" />
              <div />
              <Input label="New password" isPassword placeholder="At least 8 characters" hint="Use 8+ chars with uppercase and numbers" />
              <Input label="Confirm new password" isPassword placeholder="Re-enter password" />
            </div>
            <Button className="mt-3" onClick={() => addToast({ type: 'success', title: 'Password changed' })}>Update password</Button>
          </div>
          <div className="border-t border-ink-100 pt-5 dark:border-ink-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Two-factor authentication</h3>
                <p className="mt-0.5 text-xs text-ink-500">Add an extra layer of security to your account.</p>
              </div>
              <Button variant="outline" size="sm" leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: '2FA setup', message: 'Follow the steps to enable 2FA.' })}>Enable 2FA</Button>
            </div>
          </div>
          <div className="border-t border-ink-100 pt-5 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Account activity</h3>
            <div className="mt-3 space-y-2">
              {[
                { device: 'Chrome on Windows', location: 'Kathmandu, NP', time: 'Active now', current: true },
                { device: 'Safari on iPhone', location: 'Kathmandu, NP', time: '2 hours ago', current: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5 text-xs dark:border-ink-800">
                  <div>
                    <p className="font-medium text-ink-900 dark:text-ink-100">{s.device} {s.current && <span className="ml-1 rounded bg-success-100 px-1.5 text-[10px] text-success-700">Current</span>}</p>
                    <p className="text-ink-500">{s.location} · {s.time}</p>
                  </div>
                  {!s.current && <button className="text-error-600 hover:underline">Revoke</button>}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-3 text-error-600" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Logged out everywhere' })}>Logout from all devices</Button>
          </div>
        </div>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Notification preferences</h3>
          <p className="text-xs text-ink-500">Choose how you want to be notified about complaint updates.</p>
          <div className="overflow-hidden rounded-xl border border-ink-100 dark:border-ink-800">
            {[
              { key: 'email', label: 'Email notifications', desc: 'Updates sent to your email' },
              { key: 'sms', label: 'SMS notifications', desc: 'Text messages for urgent updates' },
              { key: 'push', label: 'Push notifications', desc: 'On your mobile device' },
              { key: 'inApp', label: 'In-app notifications', desc: 'Within the dashboard' },
            ].map((p, i) => (
              <label key={p.key} className={cn('flex cursor-pointer items-center justify-between px-4 py-3.5', i > 0 && 'border-t border-ink-100 dark:border-ink-800')}>
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{p.label}</p>
                  <p className="text-xs text-ink-500">{p.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefs((s) => ({ ...s, [p.key]: !s[p.key as keyof typeof s] }))}
                  className={cn('relative h-6 w-11 rounded-full transition', prefs[p.key as keyof typeof prefs] ? 'bg-primary-600' : 'bg-ink-200 dark:bg-ink-700')}
                  aria-pressed={prefs[p.key as keyof typeof prefs]}
                  aria-label={p.label}
                >
                  <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', prefs[p.key as keyof typeof prefs] ? 'left-5' : 'left-0.5')} />
                </button>
              </label>
            ))}
          </div>
          <Button onClick={() => addToast({ type: 'success', title: 'Preferences saved' })}>Save preferences</Button>
        </div>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <Palette className="h-4 w-4" />,
      content: (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Theme</h3>
            <p className="mt-0.5 text-xs text-ink-500">Choose your preferred appearance.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={() => theme !== 'light' && toggleTheme()} className={cn('rounded-xl border-2 p-4 text-left transition', theme === 'light' ? 'border-primary-500 bg-primary-50/40' : 'border-ink-200 dark:border-ink-700')}>
                <div className="mb-2 flex h-16 rounded-lg bg-gradient-to-br from-white to-ink-100" />
                <p className="text-sm font-medium text-ink-900 dark:text-ink-100">Light</p>
              </button>
              <button onClick={() => theme !== 'dark' && toggleTheme()} className={cn('rounded-xl border-2 p-4 text-left transition', theme === 'dark' ? 'border-primary-500 bg-primary-50/40' : 'border-ink-200 dark:border-ink-700')}>
                <div className="mb-2 flex h-16 rounded-lg bg-gradient-to-br from-ink-800 to-ink-950" />
                <p className="text-sm font-medium text-ink-900 dark:text-ink-100">Dark</p>
              </button>
            </div>
          </div>
          <div className="border-t border-ink-100 pt-5 dark:border-ink-800">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-100"><Globe className="h-4 w-4" /> Language</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { code: 'en', label: 'English' },
                { code: 'ne', label: 'नेपाली' },
              ].map((l) => (
                <button key={l.code} onClick={() => setLang(l.code as 'en' | 'ne')} className={cn('rounded-xl border-2 p-3 text-sm font-medium transition', lang === l.code ? 'border-primary-500 bg-primary-50/40 text-primary-700' : 'border-ink-200 text-ink-600 dark:border-ink-700')}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-ink-100 pt-5 dark:border-ink-800">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-100"><Accessibility className="h-4 w-4" /> Accessibility</h3>
            <div className="mt-3 space-y-3">
              <Checkbox label="Reduced motion (minimise animations)" checked={a11y.reducedMotion} onChange={(v) => setA11y((s) => ({ ...s, reducedMotion: v }))} />
              <Checkbox label="Larger text size" checked={a11y.largeText} onChange={(v) => setA11y((s) => ({ ...s, largeText: v }))} />
              <Checkbox label="Colour-blind friendly indicators" checked={a11y.colorblind} onChange={(v) => setA11y((s) => ({ ...s, colorblind: v }))} />
            </div>
            <Button className="mt-3" onClick={() => addToast({ type: 'success', title: 'Settings saved' })}>Save accessibility settings</Button>
          </div>
        </div>
      ),
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: <ShieldCheck className="h-4 w-4" />,
      content: (
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Privacy controls</h3>
          <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
            <Checkbox label="Allow my complaints to appear on the public map (location only)" checked={true} onChange={() => {}} />
            <div className="mt-3"><Checkbox label="Show my name to assigned staff only" checked={true} onChange={() => {}} /></div>
            <div className="mt-3"><Checkbox label="Anonymous by default for new complaints" checked={false} onChange={() => {}} /></div>
          </div>
          <div className="border-t border-ink-100 pt-5 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Your data</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Data export started', message: 'You will receive an email with your data.' })}>Download my data</Button>
              <Button variant="outline" className="text-error-600" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setShowDelete(true)}>Delete my account</Button>
            </div>
            <p className="mt-2 text-xs text-ink-400">Account deletion removes your personal data but retains complaint records for municipal accountability.</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Profile & Settings" subtitle="Manage your account, security, and preferences." breadcrumbs={[{ label: 'Dashboard', to: `${linkPrefix}/dashboard` }, { label: 'Profile' }]} />
      <Card className="p-5">
        <Tabs tabs={tabs} defaultTab="profile" variant="pill" />
      </Card>
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => addToast({ type: 'info', title: 'Deletion requested', message: 'Your account deletion request has been submitted.' })}
        title="Delete your account?"
        message="This will permanently remove your personal data. This action cannot be undone. Complaint records are retained for municipal purposes."
        confirmLabel="Delete account"
        variant="danger"
      />
    </div>
  );
}
