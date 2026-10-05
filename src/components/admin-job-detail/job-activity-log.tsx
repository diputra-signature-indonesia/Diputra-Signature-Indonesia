'use client';

import { loadMoreJobActivityAction } from '@/app/admin/all-jobs/[jobId]/activity-actions';
import type { JobActivityCategory, JobActivityItem, JobActivityPage } from '@/lib/supabase/queries/job-activity';
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  FileClock,
  LoaderCircle,
  MessageSquareText,
  Search,
  Settings2,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

type Filter = 'all' | JobActivityCategory;

const categoryOptions: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All activities' },
  { value: 'job', label: 'Job & workflow' },
  { value: 'task', label: 'Tasks' },
  { value: 'remark', label: 'Remarks' },
  { value: 'contributor', label: 'Contributors' },
  { value: 'system', label: 'Configuration' },
];

const categoryStyle: Record<JobActivityCategory, { Icon: LucideIcon; icon: string; background: string }> = {
  job: { Icon: BriefcaseBusiness, icon: 'text-[#9F1010]', background: 'bg-[#FCECEC]' },
  task: { Icon: ClipboardList, icon: 'text-[#245293]', background: 'bg-[#EAF1FC]' },
  remark: { Icon: MessageSquareText, icon: 'text-[#8A5A00]', background: 'bg-[#FFF4D6]' },
  contributor: { Icon: UserRoundPlus, icon: 'text-[#14744B]', background: 'bg-[#E8F7F0]' },
  system: { Icon: Settings2, icon: 'text-[#586273]', background: 'bg-[#EEF1F4]' },
};

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Makassar',
});

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function searchableText(item: JobActivityItem) {
  return [item.title, item.description, item.targetLabel, item.reason, item.actor.name, item.action,
    ...item.changes.flatMap((change) => [change.label, change.before, change.after])]
    .filter(Boolean).join(' ').toLocaleLowerCase();
}

function ActivityChanges({ item }: { item: JobActivityItem }) {
  if (!item.changes.length) return null;
  return (
    <div className="mt-3 grid gap-2 lg:grid-cols-2">
      {item.changes.map((change) => (
        <div key={`${item.id}-${change.label}`} className="rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] px-3 py-2.5">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-[#8A94A3] uppercase">{change.label}</p>
          <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs">
            {change.before ? <span className="min-w-0 truncate text-[#7B8491] line-through decoration-[#C7CCD3]">{change.before}</span> : null}
            {change.before && change.after ? <ArrowRight className="size-3.5 shrink-0 text-[#A3AAB4]" /> : null}
            {change.after ? <span className="min-w-0 font-semibold text-[#303846]">{change.after}</span> : <span className="font-semibold text-[#A51919]">Removed</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityEntry({ item, last }: { item: JobActivityItem; last: boolean }) {
  const { Icon, icon, background } = categoryStyle[item.category];
  return (
    <article className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-3 sm:grid-cols-[42px_minmax(0,1fr)] sm:gap-4">
      {!last ? <span aria-hidden="true" className="absolute top-10 bottom-[-20px] left-[17px] w-px bg-[#E2E5E9] sm:left-[20px]" /> : null}
      <span className={`relative z-10 flex size-9 items-center justify-center rounded-full ring-4 ring-white sm:size-10 ${background} ${icon}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 rounded-xl border border-[#DEE2E7] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[#202938]">{item.title}</h3>
              <span className="rounded-full bg-[#F1F3F5] px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-[#6F7885]">{item.action}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#707988]">{item.description}</p>
            {item.targetLabel ? <p className="mt-2 border-l-2 border-[#D1A900] pl-2.5 text-xs font-semibold leading-5 text-[#3D4756]">{item.targetLabel}</p> : null}
          </div>
          <time dateTime={item.createdAt} title={new Date(item.createdAt).toISOString()} className="shrink-0 text-[11px] font-medium text-[#7B8491]">
            {timeFormat.format(new Date(item.createdAt))} WITA
          </time>
        </div>
        {item.reason ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"><span className="font-semibold">Reason:</span> {item.reason}</div> : null}
        <ActivityChanges item={item} />
        <div className="mt-4 flex items-center gap-2 border-t border-[#ECEEF1] pt-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#F7EAEA] text-[9px] font-bold text-[#8C1010]">{initials(item.actor.name)}</span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-[#3D4756]">{item.actor.name}</p>
            <p className="text-[9px] text-[#8A94A3]">Activity owner</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function JobActivityLog({ jobId, initialPage }: { jobId: string; initialPage: JobActivityPage }) {
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return items.filter((item) => (filter === 'all' || item.category === filter) && (!normalized || searchableText(item).includes(normalized)));
  }, [filter, items, query]);

  const groups = useMemo(() => {
    const output: { day: string; items: JobActivityItem[] }[] = [];
    for (const item of visibleItems) {
      const day = dayFormat.format(new Date(item.createdAt));
      const group = output.at(-1);
      if (group?.day === day) group.items.push(item);
      else output.push({ day, items: [item] });
    }
    return output;
  }, [visibleItems]);

  function loadMore() {
    if (!nextCursor || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await loadMoreJobActivityAction({ jobId, before: nextCursor });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...result.page.items.filter((item) => !known.has(item.id))];
      });
      setNextCursor(result.page.nextCursor);
    });
  }

  return (
    <main className="space-y-5 px-4 py-5 sm:px-5 lg:px-6">
      <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
        <header className="flex flex-col gap-4 border-b border-[#E4E7EB] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F9E9E9] text-[#9F1010]"><FileClock className="size-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-[#202938]">Jobs Logging</h2>
                <span className="rounded-full bg-[#F1F3F5] px-2.5 py-1 text-[10px] font-semibold text-[#667181]">{items.length}{nextCursor ? '+' : ''} activities</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#707988]">An append-only history of changes made to this Job, its workflow, Tasks, Remarks, and contributors.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="size-4" />Audit trail active</div>
        </header>

        <div className="grid gap-3 border-b border-[#ECEEF1] bg-[#FAFBFC] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:px-6">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#929BA8]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity, user, Task, or change..." className="h-10 w-full rounded-lg border border-[#D8DDE3] bg-white pr-3 pl-10 text-xs text-[#303846] outline-none placeholder:text-[#9AA3AF] focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10" />
          </label>
          <label className="relative block">
            <Activity className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#929BA8]" />
            <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="h-10 w-full appearance-none rounded-lg border border-[#D8DDE3] bg-white pr-3 pl-10 text-xs font-medium text-[#3D4756] outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10">
              {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="px-5 py-6 sm:px-6">
          {groups.length ? <div className="space-y-7">{groups.map((group) => (
            <section key={group.day}>
              <div className="mb-4 flex items-center gap-3"><p className="shrink-0 text-[10px] font-semibold tracking-[0.12em] text-[#7B8491] uppercase">{group.day}</p><span className="h-px flex-1 bg-[#E7E9ED]" /></div>
              <div className="space-y-5">{group.items.map((item, index) => <ActivityEntry key={item.id} item={item} last={index === group.items.length - 1} />)}</div>
            </section>
          ))}</div> : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#CCD2DA] bg-[#FAFBFC] px-6 text-center">
              <CircleUserRound className="size-9 text-[#A4ACB7]" />
              <h3 className="mt-3 text-sm font-semibold text-[#303846]">{items.length ? 'No matching activity' : 'No activity recorded yet'}</h3>
              <p className="mt-1 max-w-md text-xs leading-5 text-[#7B8491]">{items.length ? 'Adjust the search term or activity filter.' : 'Changes to this Job will automatically appear here.'}</p>
            </div>
          )}

          {error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">{error}</p> : null}
          {nextCursor ? <div className="mt-6 flex justify-center"><button type="button" disabled={pending} onClick={loadMore} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#C9CFD7] bg-white px-5 text-xs font-semibold text-[#3D4756] hover:bg-[#F8F9FA] disabled:opacity-50">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <FileClock className="size-4" />}{pending ? 'Loading history...' : 'Load older activity'}</button></div> : null}
        </div>
      </section>
    </main>
  );
}
