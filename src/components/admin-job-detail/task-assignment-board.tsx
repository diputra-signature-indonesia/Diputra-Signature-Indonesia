'use client';

import { taskAssignmentStatuses, type TaskAssignmentItem, type TaskAssignmentStatus } from '@/data/admin-job-detail/task-assignment-dummy-data';
import { TaskAssignmentColumn } from './task-assignment-column';

type TaskAssignmentBoardProps = {
  tasks: TaskAssignmentItem[];
  onAdd: (status: TaskAssignmentStatus) => void;
  onTitleChange: (taskId: string, title: string) => void;
};

export function TaskAssignmentBoard({ tasks, onAdd, onTitleChange }: TaskAssignmentBoardProps) {
  return (
    <section aria-label="Task assignment board" className="grid items-start gap-5 px-4 pt-5 pb-16 sm:px-5 sm:pb-20 lg:px-6 xl:grid-cols-3">
      {taskAssignmentStatuses.map((status) => (
        <TaskAssignmentColumn
          key={status}
          status={status}
          tasks={tasks.filter((task) => task.status === status)}
          onAdd={onAdd}
          onTitleChange={onTitleChange}
        />
      ))}
    </section>
  );
}
