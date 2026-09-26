'use client';

import type { TaskAssignmentItem, TaskAssignmentStatus } from '@/data/admin-job-detail/task-assignment-dummy-data';
import { Plus } from 'lucide-react';
import { TaskAssignmentCard } from './task-assignment-card';

type TaskAssignmentColumnProps = {
  status: TaskAssignmentStatus;
  tasks: TaskAssignmentItem[];
  onAdd: (status: TaskAssignmentStatus) => void;
  onTitleChange: (taskId: string, title: string) => void;
};

export function TaskAssignmentColumn({ status, tasks, onAdd, onTitleChange }: TaskAssignmentColumnProps) {
  return (
    <section className="min-w-0 rounded-xl border border-[#D9DDE3] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-lg font-semibold text-[#292323]">{status}</h2>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#DDF8E7] text-[11px] font-semibold text-[#43875A]">{tasks.length}</span>
        </div>
        <button
          type="button"
          onClick={() => onAdd(status)}
          aria-label={`Add task to ${status}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#282323] transition hover:bg-[#F6ECEA] hover:text-[#9F1010] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/30"
        >
          <Plus aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </button>
      </header>

      <div className="space-y-4">
        {tasks.map((task) => (
          <TaskAssignmentCard key={task.id} task={task} onTitleChange={onTitleChange} />
        ))}
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D9DDE3] px-4 py-8 text-center text-xs text-[#9199A6]">No tasks in this status.</div>
        ) : null}
      </div>
    </section>
  );
}
