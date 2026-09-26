'use client';

import { useMemo, useState } from 'react';
import type { DashboardData, DashboardMetric, PicTaskLoad, TaskInternalServiceSummary, AttentionTask } from '@/types/admin-dashboard';
import { DashboardAttentionTable } from './dashboard-attention-table';
import { DashboardCategoryCard } from './dashboard-category-card';
import { DashboardFilters, initialDashboardFilters, type DashboardFilterState } from './dashboard-filters';
import { DashboardPicLoadCard } from './dashboard-pic-load-card';
import { DashboardStatCards } from './dashboard-stat-cards';

const serviceColors = ['#7B0000', '#F2C900', '#64748B', '#2563EB', '#F97316', '#14A45A', '#9333EA', '#0891B2', '#DB2777', '#A16207'];
const delayedStatusCodes = new Set(['ON_HOLD', 'OBSTACLE', 'BLOCKED', 'DELAYED']);

function todayInMakassar() {
  const parts = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Makassar' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function deadlineLabel(date: string | null, today: string) {
  if (!date) return { label: 'Tanpa deadline', tone: 'normal' as const, days: Number.POSITIVE_INFINITY };
  const days = daysUntil(date, today);
  if (days < 0) return { label: `Lewat ${-days} hari`, tone: 'urgent' as const, days };
  if (days === 0) return { label: 'Hari ini', tone: 'urgent' as const, days };
  if (days === 1) return { label: 'Besok', tone: 'warning' as const, days };
  return { label: `H-${days}`, tone: days <= 7 ? 'warning' as const : 'normal' as const, days };
}

export function DashboardWorkspace({ data }: { data: DashboardData }) {
  const [filters, setFilters] = useState<DashboardFilterState>(initialDashboardFilters);
  const today = useMemo(() => todayInMakassar(), []);
  const filteredTasks = useMemo(() => data.tasks.filter((task) => {
    if (filters.pic && (task.assigneeId ?? 'UNASSIGNED') !== filters.pic) return false;
    if (filters.client && task.clientId !== filters.client) return false;
    if (filters.status && task.statusId !== filters.status) return false;
    if (filters.internalService && task.internalServiceId !== filters.internalService) return false;
    if (filters.dateFrom && (!task.dueDate || task.dueDate < filters.dateFrom)) return false;
    if (filters.dateTo && (!task.dueDate || task.dueDate > filters.dateTo)) return false;
    return true;
  }), [data.tasks, filters]);

  const dashboard = useMemo(() => {
    const activeTasks = filteredTasks.filter((task) => task.statusCode !== 'COMPLETED');
    const dueDays = (task: (typeof filteredTasks)[number]) => task.dueDate ? daysUntil(task.dueDate, today) : null;
    const metrics: DashboardMetric[] = [
      { label: 'Total Task Aktif', value: activeTasks.length, icon: 'active', tone: 'brand' },
      { label: 'Belum Dimulai', value: filteredTasks.filter((task) => task.statusCode === 'NOT_STARTED').length, icon: 'not-started', tone: 'neutral' },
      { label: 'Dalam Proses', value: filteredTasks.filter((task) => task.statusCode === 'IN_PROGRESS').length, icon: 'in-progress', tone: 'yellow' },
      { label: 'Tertunda', value: filteredTasks.filter((task) => delayedStatusCodes.has(task.statusCode)).length, icon: 'delayed', tone: 'red' },
      { label: 'Selesai', value: filteredTasks.filter((task) => task.statusCode === 'COMPLETED').length, icon: 'completed', tone: 'green' },
      { label: 'Mendekati Deadline', value: activeTasks.filter((task) => { const days = dueDays(task); return days !== null && days >= 1 && days <= 7; }).length, icon: 'near-deadline', tone: 'yellow' },
      { label: 'Deadline Hari Ini', value: activeTasks.filter((task) => dueDays(task) === 0).length, icon: 'due-today', tone: 'brand' },
      { label: 'Melewati Deadline', value: activeTasks.filter((task) => { const days = dueDays(task); return days !== null && days < 0; }).length, icon: 'overdue', tone: 'red' },
    ];

    const picMap = new Map<string, PicTaskLoad>();
    for (const task of activeTasks) {
      const id = task.assigneeId ?? 'UNASSIGNED';
      const current = picMap.get(id) ?? { id, name: task.assigneeName, notStarted: 0, inProgress: 0, delayed: 0 };
      if (task.statusCode === 'NOT_STARTED') current.notStarted += 1;
      else if (task.statusCode === 'IN_PROGRESS') current.inProgress += 1;
      else if (delayedStatusCodes.has(task.statusCode)) current.delayed += 1;
      picMap.set(id, current);
    }
    const taskLoads = [...picMap.values()].sort((left, right) => {
      const rightTotal = right.notStarted + right.inProgress + right.delayed;
      const leftTotal = left.notStarted + left.inProgress + left.delayed;
      return rightTotal - leftTotal || left.name.localeCompare(right.name);
    });

    const serviceMap = new Map<string, TaskInternalServiceSummary>();
    for (const task of activeTasks) {
      const current = serviceMap.get(task.internalServiceId) ?? { id: task.internalServiceId, label: task.internalServiceName, value: 0, color: '' };
      current.value += 1;
      serviceMap.set(task.internalServiceId, current);
    }
    const internalServices = [...serviceMap.values()]
      .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
      .map((service, index) => ({ ...service, color: serviceColors[index % serviceColors.length] }));

    const attentionTasks: AttentionTask[] = activeTasks
      .map((task) => ({ task, deadline: deadlineLabel(task.dueDate, today) }))
      .filter(({ task, deadline }) => delayedStatusCodes.has(task.statusCode) || deadline.days <= 7)
      .sort((left, right) => left.deadline.days - right.deadline.days || left.task.title.localeCompare(right.task.title))
      .slice(0, 10)
      .map(({ task, deadline }) => ({
        id: task.id, jobId: task.jobId, client: task.clientName, task: task.title, pic: task.assigneeName,
        internalService: task.internalServiceName, priority: task.priorityName, priorityColor: task.priorityColor,
        status: task.statusName, statusColor: task.statusColor, progress: task.progress,
        deadline: deadline.label, deadlineTone: deadline.tone,
      }));

    return { metrics, taskLoads, internalServices, attentionTasks };
  }, [filteredTasks, today]);

  return (
    <>
      <DashboardFilters options={data.filterOptions} onApply={setFilters} />
      <div className="space-y-5 px-4 py-5 sm:px-5 lg:px-6">
        <DashboardStatCards metrics={dashboard.metrics} />
        <section className="grid gap-5 xl:grid-cols-2">
          <DashboardPicLoadCard taskLoads={dashboard.taskLoads} />
          <DashboardCategoryCard internalServices={dashboard.internalServices} />
        </section>
        <DashboardAttentionTable tasks={dashboard.attentionTasks} />
      </div>
    </>
  );
}
