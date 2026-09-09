'use client';

import {
  initialTaskAssignmentFilters,
  initialTaskAssignments,
  type TaskAssignmentFilterState,
  type TaskAssignmentItem,
  type TaskAssignmentStatus,
} from '@/data/admin-job-detail/task-assignment-dummy-data';
import { useMemo, useState } from 'react';
import { TaskAssignmentBoard } from './task-assignment-board';
import { TaskAssignmentFilters } from './task-assignment-filters';

export function TaskAssignmentContent() {
  const [tasks, setTasks] = useState<TaskAssignmentItem[]>(initialTaskAssignments);
  const [draftFilters, setDraftFilters] = useState<TaskAssignmentFilterState>(initialTaskAssignmentFilters);
  const [appliedFilters, setAppliedFilters] = useState<TaskAssignmentFilterState>(initialTaskAssignmentFilters);

  const visibleTasks = useMemo(() => {
    const query = appliedFilters.query.trim().toLocaleLowerCase();

    return tasks.filter((task) => {
      if (task.isDraft) return true;
      if (query && !`${task.title} ${task.assignee}`.toLocaleLowerCase().includes(query)) return false;
      if (appliedFilters.pic !== 'All Assignees' && task.assignee !== appliedFilters.pic) return false;
      if (appliedFilters.status !== 'All Statuses' && task.status !== appliedFilters.status) return false;
      if (appliedFilters.priority !== 'All Priorities' && task.priority !== appliedFilters.priority) return false;
      if (appliedFilters.dateFrom && task.dueDate < appliedFilters.dateFrom) return false;
      if (appliedFilters.dateTo && task.dueDate > appliedFilters.dateTo) return false;
      return true;
    });
  }, [appliedFilters, tasks]);

  const addTask = (status: TaskAssignmentStatus) => {
    const newTask: TaskAssignmentItem = {
      id: `draft-${Date.now()}`,
      title: '',
      assignee: 'Unassigned',
      initials: '?',
      dueDate: '',
      dueLabel: 'Set due date',
      priority: 'Medium',
      status,
      isDraft: true,
    };

    setTasks((current) => [newTask, ...current]);
  };

  const updateTaskTitle = (taskId: string, title: string) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, title } : task)));
  };

  const resetFilters = () => {
    setDraftFilters(initialTaskAssignmentFilters);
    setAppliedFilters(initialTaskAssignmentFilters);
  };

  return (
    <div className="min-h-[calc(100vh-176px)] bg-[#F8F9FA]">
      <TaskAssignmentFilters
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={() => setAppliedFilters(draftFilters)}
        onReset={resetFilters}
      />
      <TaskAssignmentBoard tasks={visibleTasks} onAdd={addTask} onTitleChange={updateTaskTitle} />
    </div>
  );
}
