'use client';

import { loadJobDeletionImpact, permanentlyDeleteJobAction, type JobDeletionImpact } from '@/app/admin/all-jobs/trash-actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, useTransition } from 'react';

export function JobDeletionModal({ jobId, version, onClose, onSaved }: { jobId: string; version: number; onClose: () => void; onSaved: (message: string) => void }) {
  const router = useRouter();
  const id = useId();
  const [impact, setImpact] = useState<JobDeletionImpact | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [stage, setStage] = useState<'impact' | 'confirm'>('impact');
  const [confirmation, setConfirmation] = useState('');
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let active = true;
    void loadJobDeletionImpact({ jobId, version })
      .then((result) => {
        if (!active) return;
        if (result.ok) setImpact(result.data);
        else setError(result.message);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('Dampak penghapusan gagal dimuat.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [jobId, version, reload]);
  function submit() {
    if (!impact || stage !== 'confirm' || confirmation !== impact.title || pending) return;
    setError('');
    startTransition(async () => {
      try {
        const result = await permanentlyDeleteJobAction({ jobId, version, confirmation });
        if (!result.ok) {
          setError(result.message);
          router.refresh();
          return;
        }
        onSaved(result.message);
        onClose();
        router.refresh();
      } catch {
        setError('Hasil penghapusan belum dapat dikonfirmasi. Muat ulang data; jika Job masih ada, ulangi Delete permanently untuk melanjutkan.');
        router.refresh();
      }
    });
  }
  const counts = impact
    ? ([
        ['Task (termasuk yang sudah dihapus)', impact.tasks],
        ['Tahapan workflow', impact.steps],
        ['Kolom status task', impact.statuses],
        ['Remark / progress update', impact.remarks],
        ['Keanggotaan contributor pada Job ini', impact.contributors],
        ['Jobs Logging', impact.logs],
        ['Dokumen terdaftar', impact.documents],
        ['Folder Google Drive beserta seluruh isinya', impact.folders],
        ['Group / subfolder dokumen (termasuk Trash)', impact.groups ?? 0],
      ] as const)
    : [];
  return (
    <AdminModal
      open
      onClose={() => !pending && onClose()}
      title={stage === 'impact' ? 'Review deletion impact' : 'Delete Job permanently?'}
      description={impact?.title ?? 'Memeriksa data Job...'}
      size="md"
      footer={
        <>
          <button type="button" disabled={pending} onClick={onClose} className="rounded-lg border border-[#D4D9E1] px-4 py-2 text-sm font-semibold disabled:opacity-50">
            Cancel
          </button>
          {stage === 'confirm' ? (
            <button type="button" disabled={pending} onClick={() => setStage('impact')} className="rounded-lg px-4 py-2 text-sm font-semibold">
              Back
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending || loading || !impact || (stage === 'confirm' && confirmation !== impact.title)}
            onClick={() => (stage === 'impact' ? setStage('confirm') : submit())}
            className="inline-flex items-center gap-2 rounded-lg bg-[#9F1010] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {pending ? 'Deleting...' : stage === 'impact' ? 'Continue' : 'Delete permanently'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Memeriksa dampak penghapusan...
          </p>
        ) : null}
        {impact?.pending ? (
          <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Penghapusan sebelumnya belum selesai. Job terkunci; lanjutkan untuk mencoba ulang pembersihan yang tersisa.
          </p>
        ) : null}
        {impact && stage === 'impact' ? (
          <>
            <p className="text-sm leading-6 text-[#586273]">Job ini akan dihapus permanen, tanpa melalui Trash. Berikut data yang ikut hilang:</p>
            <dl className="divide-y divide-[#E4E7EB] rounded-lg border border-[#E4E7EB]">
              {counts.map(([label, count]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-[#586273]">{label}</dt>
                  <dd className="font-semibold">{count}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-5 text-[#707988]">
              Jumlah dokumen adalah metadata terdaftar. Seluruh isi folder Job, termasuk file yang ditambahkan langsung di Drive, juga dihapus. Data diperiksa kembali sebelum proses dimulai.
            </p>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
              Review tetap disimpan ({impact.reviews}); hanya hubungan ke Job yang dilepas. {impact.unusedReviewLinks} link review yang belum dipakai akan dinonaktifkan. Data client, akun user, master
              data, dan SOP tidak dihapus.
            </div>
          </>
        ) : null}
        {impact && stage === 'confirm' ? (
          <>
            <p className="text-sm leading-6 text-[#586273]">Penghapusan ini tidak dapat dibatalkan. Jika pembersihan Drive gagal, Job tetap terkunci agar proses dapat dilanjutkan dengan aman.</p>
            <label htmlFor={id} className="block text-sm font-semibold">
              Ketik judul Job persis untuk konfirmasi
            </label>
            <p className="rounded-lg bg-[#F7F8FA] p-3 text-sm font-semibold break-words">{impact.title}</p>
            <input
              id={id}
              autoFocus
              autoComplete="off"
              value={confirmation}
              disabled={pending}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
            />
          </>
        ) : null}
        {error ? (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            {!impact ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setLoading(true);
                  setReload((value) => value + 1);
                }}
                className="mt-2 font-semibold underline"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminModal>
  );
}
