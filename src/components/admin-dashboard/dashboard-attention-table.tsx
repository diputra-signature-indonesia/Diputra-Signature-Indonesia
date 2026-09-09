import type { AttentionTask } from '@/data/admin-dashboard/dashboard-dummy-data';
import { ChevronDown, EllipsisVertical } from 'lucide-react';
import Link from 'next/link';

function PriorityBadge({ priority }: { priority: AttentionTask['priority'] }) {
  const isHigh = priority === 'High';

  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase ${isHigh ? 'bg-[#FFDADA] text-[#A80C0C]' : 'bg-[#FFF1C9] text-[#8A7100]'}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: AttentionTask['status'] }) {
  const isOnHold = status === 'On Hold';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${isOnHold ? 'border-[#194DB8] bg-[#EAF1FF] text-[#073A98]' : 'border-[#E4B400] bg-[#FFF9E8] text-[#5F4A24]'}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
      {isOnHold ? null : <ChevronDown aria-hidden="true" className="size-3" />}
    </span>
  );
}

export function DashboardAttentionTable({ tasks }: { tasks: AttentionTask[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#DEE2E7] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#DEE2E7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-xl font-semibold text-[#202938]">Task Memerlukan Perhatian</h2>
          <p className="mt-1 text-sm text-[#A0A8B6]">Task tertunda, mendekati deadline, atau telah melewati estimasi selesai.</p>
        </div>
        <Link
          href="/admin/all-jobs"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded border border-[#A61919] px-6 text-xs font-semibold text-[#A61919] transition hover:bg-[#FFF6F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/30"
        >
          Lihat Semua Task
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead className="bg-[#F8F9FA] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#737373]">
            <tr>
              <th className="px-6 py-4 pl-16">Klien &amp; Task</th>
              <th className="px-4 py-4">PIC</th>
              <th className="px-4 py-4">Kategori</th>
              <th className="px-4 py-4">Prioritas</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Progress</th>
              <th className="px-4 py-4">Deadline</th>
              <th className="px-4 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-t border-[#E7E9ED] text-sm text-[#555B64] transition hover:bg-[#FCFCFD]">
                <td className="px-6 py-5 pl-16">
                  <p className="font-semibold text-[#243044]">{task.client}</p>
                  <p className="mt-0.5 text-xs text-[#858585]">{task.task}</p>
                </td>
                <td className="px-4 py-5">{task.pic}</td>
                <td className="px-4 py-5">{task.category}</td>
                <td className="px-4 py-5"><PriorityBadge priority={task.priority} /></td>
                <td className="px-4 py-5"><StatusBadge status={task.status} /></td>
                <td className="px-4 py-5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E4E7EB]">
                      <div className="h-full rounded-full bg-[#7B0000]" style={{ width: `${task.progress}%` }} />
                    </div>
                    <span className="text-xs">{task.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-5">
                  <span className="inline-flex rounded border border-[#E33434] px-2 py-1 text-[10px] font-semibold uppercase text-[#D51E1E]">{task.deadline}</span>
                </td>
                <td className="px-4 py-5 text-center">
                  <button type="button" aria-label={`Actions for ${task.client}`} className="rounded-md p-1.5 text-[#98A1B0] transition hover:bg-gray-100 hover:text-[#202938]">
                    <EllipsisVertical aria-hidden="true" className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
