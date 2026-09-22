'use client';

import type { LiveTaskAssignment } from '@/lib/supabase/queries/task-assignment';
import { CalendarDays, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Task = LiveTaskAssignment['tasks'][number];
type Draft = { statusId: string; title: string } | null;
type DropTarget = { taskId: string; columnId: string; index: number; x: number; y: number };

type Props = {
  data: LiveTaskAssignment;
  tasks: Task[];
  draft: Draft;
  pending: boolean;
  onDraftChange: (draft: Draft) => void;
  onSaveDraft: () => void;
  onOpenTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onMoveTask: (task: Task, columnId: string, beforeTaskId: string | null) => void;
};

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function dueLabel(value: string | null) {
  if (!value) return 'No due date';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export function LiveTaskAssignmentBoard({ data, tasks, draft, pending, onDraftChange, onSaveDraft, onOpenTask, onDeleteTask, onMoveTask }: Props) {
  const boardRef = useRef<HTMLElement>(null);
  const origin = useRef<{ taskId: string; pointerId: number; x: number; y: number } | null>(null);
  const activeDrop = useRef<DropTarget | null>(null);
  const [drag, setDrag] = useState<DropTarget | null>(null);
  const columnSignature = data.columns.map((column) => column.id).join('|');

  useEffect(() => {
    if (boardRef.current) boardRef.current.scrollLeft = 0;
  }, [columnSignature]);

  function startDrag(task: Task, event: ReactPointerEvent<HTMLButtonElement>) {
    if (pending || !task.canEdit || event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { taskId: task.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function updateDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = origin.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (!activeDrop.current && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return;

    const board = boardRef.current;
    if (!board) return;
    const columns = [...board.querySelectorAll<HTMLElement>('[data-task-column]')];
    if (!columns.length) return;
    const underPointer = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-task-column]');
    const target = underPointer ?? columns.reduce((nearest, column) => {
      const midpoint = column.getBoundingClientRect().left + column.getBoundingClientRect().width / 2;
      const nearestMidpoint = nearest.getBoundingClientRect().left + nearest.getBoundingClientRect().width / 2;
      return Math.abs(midpoint - event.clientX) < Math.abs(nearestMidpoint - event.clientX) ? column : nearest;
    });
    const cards = [...target.querySelectorAll<HTMLElement>('[data-task-id]')].filter((card) => card.dataset.taskId !== start.taskId);
    const index = cards.filter((card) => event.clientY >= card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2).length;
    const next = { taskId: start.taskId, columnId: target.dataset.taskColumn!, index, x: event.clientX, y: event.clientY };
    activeDrop.current = next;
    setDrag(next);

    const rect = board.getBoundingClientRect();
    if (event.clientX > rect.right - 35) board.scrollLeft += 18;
    else if (event.clientX < rect.left + 35) board.scrollLeft -= 18;
    if (event.clientY > window.innerHeight - 45) window.scrollBy(0, 18);
    else if (event.clientY < 110) window.scrollBy(0, -18);
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = origin.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const target = activeDrop.current;
    origin.current = null;
    activeDrop.current = null;
    setDrag(null);
    if (!target || pending) return;
    const task = tasks.find((item) => item.id === start.taskId);
    if (!task) return;
    const destination = tasks.filter((item) => item.job_task_status_id === target.columnId && item.id !== task.id);
    const beforeTaskId = destination[target.index]?.id ?? null;
    const original = tasks.filter((item) => item.job_task_status_id === task.job_task_status_id);
    const nextOriginalId = original[original.findIndex((item) => item.id === task.id) + 1]?.id ?? null;
    if (target.columnId === task.job_task_status_id && beforeTaskId === nextOriginalId) return;
    onMoveTask(task, target.columnId, beforeTaskId);
  }

  function keyMove(task: Task, key: string) {
    const currentColumnIndex = data.columns.findIndex((column) => column.id === task.job_task_status_id);
    const currentTasks = tasks.filter((item) => item.job_task_status_id === task.job_task_status_id);
    const currentIndex = currentTasks.findIndex((item) => item.id === task.id);
    if (key === 'ArrowUp' && currentIndex > 0) onMoveTask(task, task.job_task_status_id, currentTasks[currentIndex - 1].id);
    if (key === 'ArrowDown' && currentIndex < currentTasks.length - 1) onMoveTask(task, task.job_task_status_id, currentTasks[currentIndex + 2]?.id ?? null);
    if (key === 'ArrowLeft' && currentColumnIndex > 0) onMoveTask(task, data.columns[currentColumnIndex - 1].id, null);
    if (key === 'ArrowRight' && currentColumnIndex < data.columns.length - 1) onMoveTask(task, data.columns[currentColumnIndex + 1].id, null);
  }

  return <>
    <section ref={boardRef} aria-label="Task assignment board" className="grid items-start gap-5 overflow-x-auto px-4 pt-4 pb-20 sm:px-5 lg:px-6" style={{ gridTemplateColumns: `repeat(${data.columns.length}, 375px)` }}>
      {data.columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.job_task_status_id === column.id);
        const showDraft = draft?.statusId === column.id;
        let shown = 0;
        return <section key={column.id} data-task-column={column.id} className={`w-[375px] rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${drag?.columnId === column.id ? 'border-[#8C1010]' : 'border-[#D9DDE3]'}`}>
          <header className="mb-4 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><h2 className="truncate text-lg font-semibold text-[#292323]">{column.name}</h2><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#DDF8E7] text-[11px] font-semibold text-[#43875A]">{columnTasks.length}</span></div>{data.canCreate ? <button type="button" aria-label={`Add task to ${column.name}`} onClick={() => onDraftChange({ statusId: column.id, title: '' })} className="flex size-8 items-center justify-center rounded-lg hover:bg-[#F6ECEA] hover:text-[#9F1010]"><Plus className="size-5" /></button> : null}</header>
          <div className="space-y-4">
            {showDraft ? <div className="rounded-lg border border-dashed border-[#B9C1CC] p-4"><input autoFocus aria-label="New task name" placeholder="Task name" value={draft.title} maxLength={500} disabled={pending} onChange={(event) => onDraftChange({ ...draft, title: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onSaveDraft(); } }} className="w-full bg-transparent text-sm outline-none" /><div className="mt-3 flex justify-end gap-2"><button type="button" disabled={pending} onClick={() => onDraftChange(null)} className="text-xs text-[#68717E]">Cancel</button><button type="button" disabled={pending || !draft.title.trim()} onClick={onSaveDraft} className="rounded bg-[#8C1010] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save Task</button></div></div> : null}
            {columnTasks.map((task) => {
              const marker = drag?.columnId === column.id && drag.index === shown;
              if (task.id !== drag?.taskId) shown++;
              return <div key={task.id}>
                {marker ? <div aria-hidden="true" className="mb-3 h-1 rounded-full bg-[#8C1010]" /> : null}
                <article data-task-id={task.id} onClick={(event) => { if ((event.target as HTMLElement).closest('button')) return; if (window.getSelection()?.toString()) return; onOpenTask(task); }} className={`rounded-lg border border-[#D9DDE3] bg-white p-4 shadow-sm transition hover:border-[#B9C1CC] ${drag?.taskId === task.id ? 'opacity-35' : ''}`}>
                  <div className="flex items-start justify-between gap-2"><button type="button" onClick={() => onOpenTask(task)} className="min-h-10 flex-1 text-left text-sm font-medium leading-6 text-[#282323]">{task.title}</button><div className="flex shrink-0 items-center gap-1">{task.canEdit ? <><button type="button" aria-label={`Drag ${task.title}. Use arrow keys to move.`} title="Drag to reorder or change status" disabled={pending} onPointerDown={(event) => startDrag(task, event)} onPointerMove={updateDrag} onPointerUp={finishDrag} onPointerCancel={() => { origin.current = null; activeDrop.current = null; setDrag(null); }} onKeyDown={(event) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); keyMove(task, event.key); } }} className="cursor-grab rounded p-1 text-[#68717E] hover:bg-gray-100 active:cursor-grabbing disabled:opacity-40" style={{ touchAction: 'none' }}><GripVertical className="size-4" /></button><button type="button" aria-label={`Delete ${task.title}`} onClick={() => onDeleteTask(task)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="size-3.5" /></button></> : null}</div></div>
                  {task.description ? <p className="mt-1 line-clamp-2 text-xs text-[#68717E]">{task.description}</p> : null}
                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-[#685754]"><span className="inline-flex items-center gap-1.5"><span className="flex size-4 items-center justify-center rounded-full bg-[#A61919] text-[7px] font-semibold text-white">{initials(task.assigneeName)}</span>{task.assigneeName}</span><span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{dueLabel(task.due_date)}</span></div>
                  {task.priorityName ? <p className="mt-2 text-[10px] font-semibold text-[#8C1010]">{task.priorityName}</p> : null}
                </article>
              </div>;
            })}
            {drag?.columnId === column.id && drag.index === shown ? <div aria-hidden="true" className="h-1 rounded-full bg-[#8C1010]" /> : null}
            {!columnTasks.length && !showDraft ? <div className="rounded-lg border border-dashed border-[#D9DDE3] px-4 py-8 text-center text-xs text-[#9199A6]">No tasks in this status.</div> : null}
          </div>
        </section>;
      })}
    </section>
    {drag ? <div aria-hidden="true" className="pointer-events-none fixed z-[80] max-w-64 rounded-lg border border-[#8C1010] bg-white px-3 py-2 text-sm font-medium text-[#282323] shadow-xl" style={{ left: drag.x + 14, top: drag.y + 14 }}>{tasks.find((task) => task.id === drag.taskId)?.title}</div> : null}
  </>;
}
