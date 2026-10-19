import type { AttentionJob } from '@/types/admin-dashboard';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}12` }}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function deadlineClasses(tone: AttentionJob['deadlineTone']) {
  if (tone === 'urgent') return 'border-[#E33434] bg-[#FFF5F5] text-[#D51E1E]';
  if (tone === 'warning') return 'border-[#E4B400] bg-[#FFF9E8] text-[#806500]';
  return 'border-[#CBD2DC] bg-[#F8F9FA] text-[#626B78]';
}

export function DashboardAttentionTable({ jobs }: { jobs: AttentionJob[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#DEE2E7] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#DEE2E7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-xl font-semibold text-[#202938]">Job Memerlukan Perhatian</h2>
          <p className="mt-1 text-sm text-[#A0A8B6]">Job tertunda, mendekati deadline, atau telah melewati estimasi selesai.</p>
        </div>
        <Link
          href="/admin/all-jobs"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded border border-[#A61919] px-6 text-xs font-semibold text-[#A61919] transition hover:bg-[#FFF6F6] focus-visible:ring-2 focus-visible:ring-[#8C1010]/30 focus-visible:outline-none"
        >
          Lihat Semua Job
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead className="bg-[#F8F9FA] text-[11px] font-semibold tracking-[0.04em] text-[#737373] uppercase">
            <tr>
              <th className="px-6 py-4 pl-16">Klien &amp; Job</th>
              <th className="px-4 py-4">PIC</th>
              <th className="px-4 py-4">Internal Service</th>
              <th className="px-4 py-4">Prioritas</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Progress</th>
              <th className="px-4 py-4">Deadline</th>
              <th className="px-4 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr className="border-t border-[#E7E9ED]">
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-[#98A1B0]">
                  Tidak ada job yang memerlukan perhatian untuk filter ini.
                </td>
              </tr>
            ) : null}
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-[#E7E9ED] text-sm text-[#555B64] transition hover:bg-[#FCFCFD]">
                <td className="px-6 py-5 pl-16">
                  <p className="font-semibold text-[#243044]">{job.client}</p>
                  <p className="mt-0.5 text-xs text-[#858585]">{job.title}</p>
                </td>
                <td className="px-4 py-5">{job.pic}</td>
                <td className="px-4 py-5">{job.internalService}</td>
                <td className="px-4 py-5">
                  <Badge label={job.priority} color={job.priorityColor} />
                </td>
                <td className="px-4 py-5">
                  <Badge label={job.status} color={job.statusColor} />
                </td>
                <td className="px-4 py-5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E4E7EB]">
                      <div className="h-full rounded-full bg-[#7B0000]" style={{ width: `${job.progress}%` }} />
                    </div>
                    <span className="text-xs">{job.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-5">
                  <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-semibold uppercase ${deadlineClasses(job.deadlineTone)}`}>{job.deadline}</span>
                </td>
                <td className="px-4 py-5 text-center">
                  <Link
                    href={`/admin/all-jobs/${job.id}`}
                    aria-label={`Buka job ${job.title}`}
                    className="inline-flex rounded-md p-1.5 text-[#98A1B0] transition hover:bg-gray-100 hover:text-[#202938]"
                  >
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
