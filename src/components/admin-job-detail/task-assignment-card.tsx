'use client';

import type { TaskAssignmentItem } from '@/data/admin-job-detail/task-assignment-dummy-data';
import { CalendarDays } from 'lucide-react';

type TaskAssignmentCardProps = {
  task: TaskAssignmentItem;
  onTitleChange: (taskId: string, title: string) => void;
};

export function TaskAssignmentCard({ task, onTitleChange }: TaskAssignmentCardProps) {
  return (
    <article className="rounded-lg border border-[#D9DDE3] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition hover:border-[#C9CED6] hover:shadow-sm">
      {task.isDraft ? (
        <input
          autoFocus
          value={task.title}
          onChange={(event) => onTitleChange(task.id, event.target.value)}
          placeholder="Task name"
          aria-label="New task name"
          className="w-full border-0 bg-transparent text-sm font-medium leading-6 text-[#282323] outline-none placeholder:text-[#A3A8B1]"
        />
      ) : (
        <h3 className="min-h-12 text-sm font-medium leading-6 text-[#282323]">{task.title}</h3>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#685754]">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center rounded-full bg-[#A61919] text-[7px] font-semibold text-white">{task.initials}</span>
          {task.isDraft ? 'Unassigned' : task.assignee}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden="true" className="size-3.5" />
          {task.isDraft ? 'Set due date' : task.dueLabel}
        </span>
      </div>
    </article>
  );
}
