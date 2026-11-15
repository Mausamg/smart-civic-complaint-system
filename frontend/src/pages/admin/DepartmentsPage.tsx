import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox,Input,Select,Textarea } from '@/components/ui/Form';
import { ConfirmDialog,Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { useApp } from '@/context/AppContext';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  setDepartmentActive,
  deleteDepartment,
  fromDepartmentApiPriority,
  toDepartmentApiPriority,
  type DepartmentApiResponse,
} from '@/services/departmentService';
import { categoryConfig,categoryOptions,priorityConfig,priorityOptions } from '@/data/metadata';
import { staffMembers } from '@/data/mockData';
import { cn,initials } from '@/utils/format';
import { Edit2,KeyRound,Plus,Trash2,Users } from 'lucide-react';
import { useEffect,useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ComplaintCategory, Priority } from '@/types';

interface DepartmentDraft {
  name: string;
  description: string;
  categoryKeys: ComplaintCategory[];
  expectedResolutionDays: string;
  defaultPriority: Priority;
}

const emptyDepartmentDraft: DepartmentDraft = {
  name: '',
  description: '',
  categoryKeys: [],
  expectedResolutionDays: '7',
  defaultPriority: 'medium',
};

export function DepartmentsPage() {
  const { addToast, accessToken } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const initialTab = pathname === '/admin/staff'
    ? 'staff'
    : 'departments';
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editDept, setEditDept] = useState<string | null>(null);
  const [departmentDraft, setDepartmentDraft] =
    useState<DepartmentDraft>({ ...emptyDepartmentDraft });
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [changingStatusId, setChangingStatusId] =
    useState<string | null>(null);
  const [deletingDepartmentId, setDeletingDepartmentId] =
    useState<string | null>(null);
  const [departmentToDelete, setDepartmentToDelete] =
    useState<DepartmentApiResponse | null>(null);
  const [departmentFormError, setDepartmentFormError] =
    useState<string | null>(null);
  const [departmentRows, setDepartmentRows] =
    useState<DepartmentApiResponse[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [departmentError, setDepartmentError] =
    useState<string | null>(null);
  const [reloadDepartments, setReloadDepartments] = useState(0);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();

    setDepartmentRows([]);
    setDepartmentError(null);
    setLoadingDepartments(true);

    if (!accessToken) {
      setDepartmentError(
        'Please sign in as an administrator to view departments.'
      );
      setLoadingDepartments(false);

      return () => {
        current = false;
        controller.abort();
      };
    }

    getDepartments(accessToken, controller.signal)
      .then((rows) => {
        if (current) setDepartmentRows(rows);
      })
      .catch((error: unknown) => {
        if (!current) return;

        setDepartmentError(
          error instanceof Error
            ? error.message
            : 'Unable to load departments.'
        );
      })
      .finally(() => {
        if (current) setLoadingDepartments(false);
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [accessToken, reloadDepartments]);

  const closeDepartmentForm = () => {
    if (savingDepartment) return;

    setShowAdd(false);
    setEditDept(null);
    setDepartmentFormError(null);
  };

  const openCreateDepartment = () => {
    setEditDept(null);
    setDepartmentDraft({ ...emptyDepartmentDraft });
    setDepartmentFormError(null);
    setShowAdd(true);
  };

  const openEditDepartment = (
    department: DepartmentApiResponse
  ) => {
    setEditDept(department.id);

    setDepartmentDraft({
      name: department.name,
      description: department.description ?? '',
      categoryKeys: [...department.categoryKeys],
      expectedResolutionDays: String(
        department.expectedResolutionDays
      ),
      defaultPriority: fromDepartmentApiPriority(
        department.defaultPriority
      ),
    });

    setDepartmentFormError(null);
    setShowAdd(true);
  };

  const toggleDepartmentCategory = (
    category: ComplaintCategory,
    checked: boolean
  ) => {
    setDepartmentDraft((previous) => ({
      ...previous,
      categoryKeys: checked
        ? [...new Set([...previous.categoryKeys, category])]
        : previous.categoryKeys.filter((item) => item !== category),
    }));
  };

  const saveDepartment = async () => {
    if (savingDepartment) return;

    const existingDepartment = editDept
      ? departmentRows.find((d) => d.id === editDept)
      : null;

    if (editDept && !existingDepartment) {
      setDepartmentFormError(
        'This department is no longer available. Refresh and try again.'
      );
      return;
    }

    const name = departmentDraft.name.trim();
    const description = departmentDraft.description.trim();
    const days = Number(departmentDraft.expectedResolutionDays);

    if (name.length < 2 || name.length > 120) {
      setDepartmentFormError(
        'Department name must contain 2–120 characters.'
      );
      return;
    }

    if (description.length > 500) {
      setDepartmentFormError(
        'Description cannot exceed 500 characters.'
      );
      return;
    }

    if (
      !Number.isInteger(days) ||
      days < 1 ||
      days > 365
    ) {
      setDepartmentFormError(
        'Expected resolution days must be between 1 and 365.'
      );
      return;
    }

    if (departmentDraft.categoryKeys.length === 0) {
      setDepartmentFormError(
        'Select at least one complaint category.'
      );
      return;
    }

    if (!accessToken) {
      setDepartmentFormError(
        'An administrator login is required.'
      );
      return;
    }

    setSavingDepartment(true);
    setDepartmentFormError(null);

    try {
      const request = {
        name,
        description: description || null,

        // Preserve the existing department head.
        // Staff assignment will get its own API-backed selector.
        headStaffUserId:
          existingDepartment?.headStaffUserId ?? null,

        categoryKeys: departmentDraft.categoryKeys,
        expectedResolutionDays: days,
        defaultPriority: toDepartmentApiPriority(
          departmentDraft.defaultPriority
        ),
      };

      const saved = editDept
        ? await updateDepartment(
            editDept,
            request,
            accessToken
          )
        : await createDepartment(
            request,
            accessToken
          );

      setShowAdd(false);
      setEditDept(null);
      setDepartmentDraft({ ...emptyDepartmentDraft });
      setReloadDepartments((count) => count + 1);

      addToast({
        type: 'success',
        title: editDept
          ? 'Department updated'
          : 'Department created',
        message: `${saved.name} was saved successfully.`,
      });
    } catch (error: unknown) {
      setDepartmentFormError(
        error instanceof Error
          ? error.message
          : 'Unable to create department.'
      );
    } finally {
      setSavingDepartment(false);
    }
  };

  const changeDepartmentActive = async (
    department: DepartmentApiResponse
  ) => {
    if (
      changingStatusId !== null ||
      deletingDepartmentId !== null
    ) return;

    if (!accessToken) {
      addToast({
        type: 'error',
        title: 'Administrator login required',
        message: 'Please sign in before updating a department.',
      });
      return;
    }

    const nextStatus = !department.isActive;

    setChangingStatusId(department.id);

    try {
      const updatedDepartment = await setDepartmentActive(
        department.id,
        nextStatus,
        accessToken
      );

      // Update the card only after the backend succeeds.
      setDepartmentRows((previous) =>
        previous.map((row) =>
          row.id === updatedDepartment.id
            ? updatedDepartment
            : row
        )
      );

      addToast({
        type: 'success',
        title: updatedDepartment.isActive
          ? 'Department activated'
          : 'Department deactivated',
        message: `${updatedDepartment.name} was updated successfully.`,
      });
    } catch (error: unknown) {
      // Keep the existing status when the backend refuses
      // the change, including relationship conflicts.
      addToast({
        type: 'error',
        title: 'Department status update failed',
        message: error instanceof Error
          ? error.message
          : 'Unable to change department status.',
      });
    } finally {
      setChangingStatusId(null);
    }
  };

  const openDeleteDepartment = (
    department: DepartmentApiResponse
  ) => {
    if (
      department.isActive ||
      changingStatusId !== null ||
      deletingDepartmentId !== null
    ) {
      return;
    }

    setDepartmentToDelete(department);
    setShowDelete(true);
  };

  const closeDeleteDepartment = () => {
    setShowDelete(false);
    setDepartmentToDelete(null);
  };

  const confirmDeleteDepartment = async () => {
    const selected = departmentToDelete;

    if (
      !selected ||
      selected.isActive ||
      deletingDepartmentId !== null
    ) {
      return;
    }

    if (!accessToken) {
      addToast({
        type: 'error',
        title: 'Administrator login required',
        message: 'Please sign in before deleting a department.',
      });
      return;
    }

    setDeletingDepartmentId(selected.id);

    try {
      await deleteDepartment(selected.id, accessToken);

      // Remove the card only after the server confirms deletion.
      setDepartmentRows((previous) =>
        previous.filter((row) => row.id !== selected.id)
      );

      addToast({
        type: 'success',
        title: 'Department deleted',
        message: selected.name + ' was deleted successfully.',
      });
    } catch (error: unknown) {
      addToast({
        type: 'error',
        title: 'Department deletion failed',
        message: error instanceof Error
          ? error.message
          : 'Unable to delete department.',
      });
    } finally {
      setDeletingDepartmentId(null);
    }
  };

  const tabs = [
    {
      id: 'departments',
      label: 'Departments',
      content: (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">{loadingDepartments
              ? 'Loading departments...'
              : departmentError
                ? 'Departments unavailable'
                : `${departmentRows.length} departments`}</p>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={
                loadingDepartments ||
                Boolean(departmentError) ||
                !accessToken ||
                deletingDepartmentId !== null
              }
              onClick={openCreateDepartment}
            >
              Add department
            </Button>
          </div>
          {loadingDepartments && (
            <p className="mb-4 text-sm text-ink-500" role="status">
              Loading departments from the server...
            </p>
          )}

          {departmentError && (
            <div className="mb-4 rounded-lg border border-error-200 p-4"
                 role="alert">
              <p className="mb-3 text-sm text-error-600">
                {departmentError}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReloadDepartments((n) => n + 1)}
              >
                Retry
              </Button>
            </div>
          )}

          {!loadingDepartments &&
            !departmentError &&
            departmentRows.length === 0 && (
              <p className="mb-4 text-sm text-ink-500">
                No departments have been created yet.
              </p>
            )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departmentRows.map((d) => (
              <Card key={d.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">{d.name}</h3>
                    <p className="mt-0.5 text-xs text-ink-500">Head: {d.headStaffName?.trim() || 'Not assigned'}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', d.isActive ? 'bg-success-100 text-success-700 dark:bg-success-950/40 dark:text-success-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800')}>{d.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Staff</p><p className="font-semibold text-ink-700 dark:text-ink-200">{d.staffCount}</p></div>
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Active</p><p className="font-semibold text-ink-700 dark:text-ink-200">{d.activeComplaints}</p></div>
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Avg days</p><p className="font-semibold text-ink-700 dark:text-ink-200">{d.averageResolutionDays?.toFixed(1) ?? '—'}</p></div>
                  <div className="rounded-lg bg-ink-50 p-2 dark:bg-ink-800/50"><p className="text-ink-400">Target days</p><p className="font-semibold text-ink-700 dark:text-ink-200">{d.expectedResolutionDays}</p></div>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase text-ink-400">Categories</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.categoryKeys.map((c) => (
                      <span key={c} className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">{categoryConfig[c]?.label ?? c}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                    disabled={
                      !accessToken ||
                      loadingDepartments ||
                      changingStatusId !== null ||
                      deletingDepartmentId !== null
                    }
                    onClick={() => openEditDepartment(d)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      !accessToken ||
                      loadingDepartments ||
                      changingStatusId !== null ||
                      deletingDepartmentId !== null
                    }
                    loading={changingStatusId === d.id}
                    onClick={() => void changeDepartmentActive(d)}
                  >
                    {d.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-error-600"
                    title={
                      d.isActive
                        ? 'Deactivate this department before deleting it'
                        : 'Delete department'
                    }
                    disabled={
                      d.isActive ||
                      !accessToken ||
                      loadingDepartments ||
                      changingStatusId !== null ||
                      deletingDepartmentId !== null
                    }
                    loading={deletingDepartmentId === d.id}
                    onClick={() => openDeleteDepartment(d)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} disabled>Add staff</Button>
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
                  <Button variant="ghost" size="sm" leftIcon={<Edit2 className="h-3.5 w-3.5" />} disabled>Edit</Button>
                  <Button variant="ghost" size="sm" leftIcon={<KeyRound className="h-3.5 w-3.5" />} disabled>Reset password</Button>
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
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} disabled>Add category</Button>
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
                  <Button variant="ghost" size="sm" disabled><Edit2 className="h-3.5 w-3.5" /></Button>
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
      <PageHeader title="Departments & Staff" subtitle="Manage departments, staff members, and complaint categories." breadcrumbs={[{ label: 'Admin', to: '/admin/dashboard' }, { label: initialTab === 'staff' ? 'Staff' : 'Departments' }]} />
      <Card className="p-5"><Tabs key={initialTab} tabs={tabs} defaultTab={initialTab} variant="pill" onChange={(id) => {
  if (id === 'staff') navigate('/admin/staff');
  if (id === 'departments') navigate('/admin/departments');
}} /></Card>

      <Modal
        open={showAdd}
        onClose={closeDepartmentForm}
        title={editDept ? 'Edit department' : 'Add new department'}
        description={editDept
          ? 'Update department settings and categories.'
          : 'Set up a department to handle civic complaints.'
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              disabled={savingDepartment}
              onClick={closeDepartmentForm}
            >
              Cancel
            </Button>
            <Button
              loading={savingDepartment}
              onClick={() => void saveDepartment()}
            >
              {editDept ? 'Save changes' : 'Create department'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {departmentFormError && (
            <p
              role="alert"
              className="rounded-lg border border-error-200 p-3 text-sm text-error-600"
            >
              {departmentFormError}
            </p>
          )}

          <Input
            label="Department name"
            required
            maxLength={120}
            placeholder="e.g. Roads & Infrastructure"
            value={departmentDraft.name}
            onChange={(event) =>
              setDepartmentDraft((draft) => ({
                ...draft,
                name: event.target.value,
              }))
            }
          />

          <Textarea
            label="Description (optional)"
            maxLength={500}
            value={departmentDraft.description}
            onChange={(event) =>
              setDepartmentDraft((draft) => ({
                ...draft,
                description: event.target.value,
              }))
            }
          />

          <fieldset>
            <legend className="label-base">
              Categories handled
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {categoryOptions.map((category) => (
                <Checkbox
                  key={category}
                  label={categoryConfig[category].label}
                  checked={departmentDraft.categoryKeys.includes(
                    category
                  )}
                  onChange={(checked) =>
                    toggleDepartmentCategory(category, checked)
                  }
                />
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Expected resolution (days)"
              type="number"
              min={1}
              max={365}
              required
              value={departmentDraft.expectedResolutionDays}
              onChange={(event) =>
                setDepartmentDraft((draft) => ({
                  ...draft,
                  expectedResolutionDays: event.target.value,
                }))
              }
            />

            <Select
              label="Default priority"
              value={departmentDraft.defaultPriority}
              options={priorityOptions.map((priority) => ({
                value: priority,
                label: priorityConfig[priority].label,
              }))}
              onChange={(event) =>
                setDepartmentDraft((draft) => ({
                  ...draft,
                  defaultPriority: event.target.value as Priority,
                }))
              }
            />
          </div>

          <p className="text-xs text-ink-500">
            Department head assignment will be available
            when the staff selector is connected to the API.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDelete && departmentToDelete !== null}
        onClose={closeDeleteDepartment}
        onConfirm={() => void confirmDeleteDepartment()}
        title={
          departmentToDelete
            ? `Delete ${departmentToDelete.name}?`
            : 'Delete department?'
        }
        message="Only inactive departments without assigned staff, a department head, or linked complaints can be deleted. This action cannot be undone."
        confirmLabel="Delete department"
        variant="danger"
      />
    </div>
  );
}
