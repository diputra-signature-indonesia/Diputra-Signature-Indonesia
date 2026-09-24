'use client';

import { configureTaskColumnsAction, deleteTaskAction, moveTaskAction, saveTaskAction } from '@/app/admin/all-jobs/[jobId]/task-actions';
import { AdminFilterPanel, AdminSelectField } from '@/components/layout-admin/admin-filter-panel';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { LiveTaskAssignment } from '@/lib/supabase/queries/task-assignment';
import { ArrowDown, ArrowUp, CalendarDays, LoaderCircle, Settings2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { LiveTaskAssignmentBoard } from './live-task-assignment-board';

type Task = LiveTaskAssignment['tasks'][number];
type FilterState = { query: string; assignee: string; status: string; priority: string; from: string; to: string };
type TaskForm = { title: string; description: string; assigneeId: string; priorityId: string; dueDate: string };
const emptyFilters: FilterState = { query: '', assignee: '', status: '', priority: '', from: '', to: '' };
const fieldClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none focus:border-[#8C1010]';
const emptyTaskForm: TaskForm = { title: '', description: '', assigneeId: '', priorityId: '', dueDate: '' };

function formFromTask(task: Task): TaskForm {
  return { title: task.title, description: task.description ?? '', assigneeId: task.assignee_id ?? '', priorityId: task.priority_id ?? '', dueDate: task.due_date ?? '' };
}

export function LiveTaskAssignmentContent({ data, initialTaskId }: { data: LiveTaskAssignment; initialTaskId?: string }) {
  const router = useRouter();
  const initialTask = data.tasks.find((task) => task.id === initialTaskId) ?? null;
  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [draft, setDraft] = useState<{ statusId: string; title: string } | null>(null);
  const [editing, setEditing] = useState<Task | null>(initialTask);
  const [form, setForm] = useState<TaskForm>(initialTask ? formFromTask(initialTask) : emptyTaskForm);
  const [formOpen, setFormOpen] = useState(Boolean(initialTask));
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnIds, setColumnIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(() => data.tasks.filter((task) => {
    const query = filters.query.trim().toLocaleLowerCase();
    return (!query || `${task.title} ${task.description ?? ''} ${task.assigneeName}`.toLocaleLowerCase().includes(query)) &&
      (!filters.assignee || task.assignee_id === filters.assignee) &&
      (!filters.status || task.job_task_status_id === filters.status) &&
      (!filters.priority || task.priority_id === filters.priority) &&
      (!filters.from || !!task.due_date && task.due_date >= filters.from) &&
      (!filters.to || !!task.due_date && task.due_date <= filters.to);
  }), [data.tasks, filters]);

  function openTask(task: Task) {
    setEditing(task);
    setForm(formFromTask(task));
    setError(''); setFormOpen(true);
  }

  function saveDraft() {
    if (!draft?.title.trim() || isPending) return;
    setError(''); setNotice('');
    startTransition(async () => {
      try {
        const result = await saveTaskAction({ jobId: data.jobId, statusId: draft.statusId, title: draft.title.trim(), description: '', assigneeId: data.canManage ? null : data.actorId, priorityId: null, dueDate: null });
        if (!result.ok) { setError(result.message); return; }
        setDraft(null); setNotice('Task ditambahkan. Klik card untuk melengkapi detailnya.'); router.refresh();
      } catch { setError('Koneksi terputus. Periksa Task sebelum mencoba lagi.'); }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing?.canEdit) return;
    setError(''); setNotice('');
    startTransition(async () => {
      try {
        const result = await saveTaskAction({ jobId: data.jobId, taskId: editing.id, version: editing.version, title: form.title, description: form.description, assigneeId: form.assigneeId || null, priorityId: form.priorityId || null, dueDate: form.dueDate || null });
        if (!result.ok) { setError(result.message); return; }
        setFormOpen(false); setNotice('Task diperbarui.'); router.refresh();
      } catch { setError('Koneksi terputus. Periksa Task sebelum mencoba lagi.'); }
    });
  }

  function move(task: Task, statusId: string, beforeTaskId: string | null) {
    if (isPending) return;
    setError(''); setNotice('');
    startTransition(async () => {
      try {
        const result = await moveTaskAction({ jobId: data.jobId, taskId: task.id, version: task.version, statusId, beforeTaskId });
        if (!result.ok) { setError(result.message); return; }
        setNotice('Urutan dan status Task diperbarui.'); router.refresh();
      } catch { setError('Koneksi terputus. Muat ulang halaman sebelum mencoba lagi.'); }
    });
  }

  function remove() {
    if (!deleting) return;
    setError(''); setNotice('');
    startTransition(async () => {
      try {
        const result = await deleteTaskAction({ jobId: data.jobId, taskId: deleting.id, version: deleting.version });
        if (!result.ok) { setError(result.message); return; }
        setDeleting(null); setNotice('Task dihapus.'); router.refresh();
      } catch { setError('Koneksi terputus. Muat ulang halaman sebelum mencoba lagi.'); }
    });
  }

  function saveColumns() {
    setError(''); setNotice('');
    startTransition(async () => {
      try {
        const result = await configureTaskColumnsAction({ jobId: data.jobId, statusIds: columnIds });
        if (!result.ok) { setError(result.message); return; }
        setColumnsOpen(false); setNotice('Kolom Task diperbarui.'); router.refresh();
      } catch { setError('Koneksi terputus. Muat ulang halaman sebelum mencoba lagi.'); }
    });
  }

  function reorderColumn(index: number, direction: -1 | 1) {
    const next = [...columnIds];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setColumnIds(next);
  }

  const missingStatuses = data.availableStatuses.filter((status) => !columnIds.includes(status.id));
  const currentAssignee = editing?.assignee_id && !data.profiles.some((profile) => profile.id === editing.assignee_id) ? editing : null;
  const currentPriority = editing?.priority_id && !data.priorities.some((priority) => priority.id === editing.priority_id) ? editing : null;

  return <div className="relative min-h-[calc(100vh-176px)] bg-[#F8F9FA]" aria-busy={isPending}>
    <AdminFilterPanel onReset={() => { setDraftFilters(emptyFilters); setFilters(emptyFilters); }} onSubmit={() => setFilters(draftFilters)} gridClassName="xl:grid-cols-[2.1fr_1.05fr_1.65fr_0.95fr_0.95fr]">
      <label className="block min-w-0"><span className="mb-1 block text-[11px] font-semibold">Search Tasks</span><input type="search" value={draftFilters.query} onChange={(event) => setDraftFilters({ ...draftFilters, query: event.target.value })} placeholder="Task title or assignee..." className="h-9 w-full rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-3 text-xs outline-none focus:border-[#A61919]" /></label>
      <AdminSelectField label="PIC" value={draftFilters.assignee} options={[{ value: '', label: 'All Assignees' }, ...data.profiles.map((profile) => ({ value: profile.id, label: profile.display_name }))]} onChange={(value) => setDraftFilters({ ...draftFilters, assignee: value })} />
      <fieldset className="min-w-0"><legend className="mb-1 text-[11px] font-semibold">Date Range</legend><div className="flex h-9 items-center gap-1 rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-2"><CalendarDays className="size-4 shrink-0 text-[#98A1B0]" /><input aria-label="Tasks start date" type="date" value={draftFilters.from} onChange={(event) => setDraftFilters({ ...draftFilters, from: event.target.value })} className="min-w-0 flex-1 bg-transparent text-[10px] outline-none" /><span>–</span><input aria-label="Tasks end date" type="date" min={draftFilters.from || undefined} value={draftFilters.to} onChange={(event) => setDraftFilters({ ...draftFilters, to: event.target.value })} className="min-w-0 flex-1 bg-transparent text-[10px] outline-none" /></div></fieldset>
      <AdminSelectField label="Status" value={draftFilters.status} options={[{ value: '', label: 'All Statuses' }, ...data.columns.map((column) => ({ value: column.id, label: column.name }))]} onChange={(value) => setDraftFilters({ ...draftFilters, status: value })} />
      <AdminSelectField label="Priority" value={draftFilters.priority} options={[{ value: '', label: 'All Priorities' }, ...data.priorities.map((priority) => ({ value: priority.id, label: priority.name }))]} onChange={(value) => setDraftFilters({ ...draftFilters, priority: value })} />
    </AdminFilterPanel>

    {error && !formOpen && !columnsOpen && !deleting ? <p role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-5 lg:mx-6">{error}</p> : null}
    {notice ? <p role="status" className="mx-4 mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 sm:mx-5 lg:mx-6">{notice}</p> : null}
    <div className="flex justify-end px-4 pt-4 sm:px-5 lg:px-6">{data.canManage && !data.readOnly ? <button type="button" onClick={() => { setColumnIds(data.columns.map((column) => column.task_status_id)); setError(''); setColumnsOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-[#D9DDE3] bg-white px-3 py-2 text-xs font-semibold text-[#303846] hover:border-[#8C1010]"><Settings2 className="size-4" />Atur kolom</button> : null}</div>
    <LiveTaskAssignmentBoard data={data} tasks={visible} draft={draft} pending={isPending} onDraftChange={setDraft} onSaveDraft={saveDraft} onOpenTask={openTask} onDeleteTask={(task) => { setError(''); setDeleting(task); }} onMoveTask={move} />

    <AdminModal open={formOpen} onClose={() => { if (!isPending) setFormOpen(false); }} title="Task Detail" description={editing?.canEdit ? 'Ubah informasi Task. Gunakan drag handle pada card untuk mengubah status atau urutan.' : 'Task ini hanya dapat dibaca oleh Anda.'} size="lg">
      <form onSubmit={submit} className="space-y-4"><div><label htmlFor="task-title" className="mb-1 block text-xs font-semibold">Judul Task</label><input id="task-title" maxLength={500} disabled={!editing?.canEdit} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={fieldClass} /></div><div><label htmlFor="task-description" className="mb-1 block text-xs font-semibold">Deskripsi</label><textarea id="task-description" maxLength={5000} disabled={!editing?.canEdit} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${fieldClass} h-24 py-2`} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="task-assignee" className="mb-1 block text-xs font-semibold">Assignee</label><select id="task-assignee" value={form.assigneeId} disabled={!editing?.canEdit || !data.canManage} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })} className={fieldClass}><option value="">Unassigned</option>{currentAssignee ? <option value={currentAssignee.assignee_id!}>{currentAssignee.assigneeName} (current)</option> : null}{data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}</select>{!data.canManage && editing?.canEdit ? <p className="mt-1 text-[11px] text-[#68717E]">Hanya PIC atau admin yang dapat mengganti assignee.</p> : null}</div><div><label htmlFor="task-priority" className="mb-1 block text-xs font-semibold">Priority</label><select id="task-priority" value={form.priorityId} disabled={!editing?.canEdit} onChange={(event) => setForm({ ...form, priorityId: event.target.value })} className={fieldClass}><option value="">No priority</option>{currentPriority ? <option value={currentPriority.priority_id!}>{currentPriority.priorityName} (current)</option> : null}{data.priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}</select></div></div><div><label htmlFor="task-due" className="mb-1 block text-xs font-semibold">Due Date</label><input id="task-due" type="date" disabled={!editing?.canEdit} value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className={fieldClass} /></div>{error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}<div className="flex justify-end gap-2 border-t border-[#E7E9ED] pt-4"><button type="button" disabled={isPending} onClick={() => setFormOpen(false)} className="rounded border border-[#9EACBF] px-5 py-2 text-xs font-semibold">Close</button>{editing?.canEdit ? <button type="submit" disabled={isPending || !form.title.trim() && !form.description.trim()} className="rounded bg-[#8C1010] px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Menyimpan…' : 'Save Changes'}</button> : null}</div></form>
    </AdminModal>

    <AdminModal open={Boolean(deleting)} onClose={() => { if (!isPending) setDeleting(null); }} title="Hapus Task?" description="Task akan disembunyikan dari board; riwayat tetap tersimpan." size="sm" footer={<><button type="button" disabled={isPending} onClick={() => setDeleting(null)} className="rounded border border-[#9EACBF] px-5 py-2 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending} onClick={remove} className="rounded bg-red-700 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Menghapus…' : 'Delete'}</button></>}><p className="text-sm">{deleting?.title}</p>{error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}</AdminModal>

    <AdminModal open={columnsOpen} onClose={() => { if (!isPending) setColumnsOpen(false); }} title="Atur kolom Task" description="Tambahkan status dari Master Data, lalu atur urutannya untuk Job ini.">
      <div className="space-y-2">{columnIds.map((id, index) => { const status = data.availableStatuses.find((item) => item.id === id) ?? data.columns.find((item) => item.task_status_id === id); const existing = data.columns.find((item) => item.task_status_id === id); const inUse = existing && data.tasks.some((task) => task.job_task_status_id === existing.id); return <div key={id} className="flex items-center gap-2 rounded-lg border border-[#D9DDE3] p-2"><span className="min-w-0 flex-1 truncate text-sm">{status?.name ?? 'Status tidak tersedia'}</span><button type="button" aria-label={`Move ${status?.name} up`} disabled={index === 0} onClick={() => reorderColumn(index, -1)} className="rounded p-1 disabled:opacity-30"><ArrowUp className="size-4" /></button><button type="button" aria-label={`Move ${status?.name} down`} disabled={index === columnIds.length - 1} onClick={() => reorderColumn(index, 1)} className="rounded p-1 disabled:opacity-30"><ArrowDown className="size-4" /></button><button type="button" aria-label={`Remove ${status?.name}`} disabled={columnIds.length === 1 || status?.code === 'NOT_STARTED' || Boolean(inUse)} title={inUse ? 'Pindahkan atau hapus Task pada kolom ini terlebih dahulu' : undefined} onClick={() => setColumnIds(columnIds.filter((item) => item !== id))} className="rounded p-1 text-red-600 disabled:opacity-30"><Trash2 className="size-4" /></button></div>; })}</div>
      <div className="mt-4"><p className="mb-2 text-xs font-semibold text-[#303846]">Add status column</p>{missingStatuses.length ? <div className="flex flex-wrap gap-2">{missingStatuses.map((status) => <button key={status.id} type="button" onClick={() => setColumnIds([...columnIds, status.id])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[#B9C1CC] px-3 py-2 text-xs text-[#303846] hover:border-[#8C1010] hover:text-[#8C1010]">+ {status.name}</button>)}</div> : <p className="text-xs text-[#68717E]">Semua status aktif sudah ditambahkan. Status baru dapat dibuat di Master Data.</p>}</div>
      {error ? <p role="alert" className="mt-3 text-xs text-red-700">{error}</p> : null}<div className="mt-4 flex justify-end gap-2 border-t border-[#E7E9ED] pt-4"><button type="button" disabled={isPending} onClick={() => setColumnsOpen(false)} className="rounded border border-[#9EACBF] px-5 py-2 text-xs font-semibold">Cancel</button><button type="button" disabled={isPending || !columnIds.length} onClick={saveColumns} className="rounded bg-[#8C1010] px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">{isPending ? 'Menyimpan…' : 'Save Columns'}</button></div>
    </AdminModal>

    {isPending ? <div className="absolute inset-0 z-[80] flex items-start justify-center bg-[#F8F9FA]/65 pt-[min(35vh,20rem)]" role="status" aria-label="Loading Task Assignment"><div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-[#303846] shadow-lg"><LoaderCircle className="size-5 animate-spin text-[#8C1010]" />Loading…</div></div> : null}
  </div>;
}
