import { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Star, ToggleRight, ToggleLeft, KeyRound, MoreVertical } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Input, Select } from '@/components/ui/Form';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { departments, staffMembers } from '@/data/mockData';
import { categoryConfig, categoryOptions } from '@/data/metadata';
import { useApp } from '@/context/AppContext';
import { initials, cn } from '@/utils/format';

export function DepartmentsPage() {
  const { addToast } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editDept, setEditDept] = useState<string | null>(null);

  const tabs = [
    {
      id: 'departments',
      label: 'Departments',
      content: (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">{departments.length} departments</p>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>Add department</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((d) => (
              <Card key={d.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">{d.name}</h3>
                    <p className="mt-0.5 text-xs text-ink-500">Head: {d.head}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', d.isActive ? 'bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800')}>{d.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Staff</p><p className="font-semibold text-ink-700 dark:text-ink-200">{d.staffCount}</p></div>
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Active</p><p className="font-semibold text-ink-700 dark:text-ink-200">{d.activeComplaints}</p></div>
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Avg days</p><p className="font-semibold text-ink-700 dark:text-ink-200">{d.avgResolutionDays}</p></div>
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Rating</p><p className="font-semibold text-ink-700 dark:text-ink-200">{d.satisfaction}★</p></div>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase text-ink-400">Categories</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.categories.map((c) => (
                      <span key={c} className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">{categoryConfig[c].label}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
                  <Button variant="ghost" size="sm" leftIcon={<Edit2 className="h-3.5 w-3.5" />} onClick={() => { setEditDept(d.id); setShowAdd(true); }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => addToast({ type: 'info', title: d.isActive ? 'Deactivated' : 'Activated' })}>{d.isActive ? 'Deactivate' : 'Activate'}</Button>
                  <Button variant="ghost" size="sm" className="ml-auto text-error-600" onClick={() => setShowDelete(true)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'staff',
      label: 'Staff',
      content: (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">{staffMembers.length} staff members</p>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>Add staff</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {staffMembers.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-start gap-3">
                  {s.avatar ? <img src={s.avatar} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">{initials(s.name)}</div>}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{s.name}</h3>
                    <p className="truncate text-xs text-ink-500">{s.role} · {s.department}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', s.isActive ? 'bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800')}>{s.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Active</p><p className="font-semibold text-ink-700 dark:text-ink-200">{s.activeComplaints}</p></div>
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Resolved</p><p className="font-semibold text-ink-700 dark:text-ink-200">{s.resolvedComplaints}</p></div>
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Rating</p><p className="font-semibold text-warning-600">{s.satisfaction}★</p></div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
                  <Button variant="ghost" size="sm" leftIcon={<Edit2 className="h-3.5 w-3.5" />} onClick={() => setShowAdd(true)}>Edit</Button>
                  <Button variant="ghost" size="sm" leftIcon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => addToast({ type: 'info', title: 'Password reset link sent' })}>Reset password</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'categories',
      label: 'Categories',
      content: (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">{categoryOptions.length} categories</p>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAdd(true)}>Add category</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {categoryOptions.map((c) => {
              const cfg = categoryConfig[c];
              return (
                <Card key={c} className="flex items-center gap-3 p-4">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', cfg.bg, cfg.text)}>
                    <Users className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{cfg.label}</p>
                    <p className="truncate text-xs text-ink-500">Default: {cfg.department}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)}><Edit2 className="h-3.5 w-3.5" /></Button>
                </Card>
              );
            })}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Departments & Staff" subtitle="Manage departments, staff members, and complaint categories." breadcrumbs={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Departments' }]} />
      <Card className="p-5"><Tabs tabs={tabs} defaultTab="departments" variant="pill" /></Card>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditDept(null); }} title={editDept ? 'Edit department' : 'Add new department'} size="md"
        footer={<><Button variant="outline" onClick={() => { setShowAdd(false); setEditDept(null); }}>Cancel</Button><Button onClick={() => { setShowAdd(false); setEditDept(null); addToast({ type: 'success', title: 'Saved' }); }}>Save</Button></>}>
        <div className="space-y-4">
          <Input label="Department name" placeholder="e.g. Parks & Recreation" />
          <Select label="Department head" placeholder="Select staff" options={staffMembers.map((s) => ({ value: s.id, label: s.name }))} />
          <Select label="Categories handled" placeholder="Select categories" options={categoryOptions.map((c) => ({ value: c, label: categoryConfig[c].label }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expected resolution (days)" type="number" defaultValue="7" />
            <Select label="Default priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={showDelete} onClose={() => setShowDelete(false)} onConfirm={() => addToast({ type: 'info', title: 'Department deleted' })} title="Delete this department?" message="Active complaints will need reassignment. This cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
  );
}
