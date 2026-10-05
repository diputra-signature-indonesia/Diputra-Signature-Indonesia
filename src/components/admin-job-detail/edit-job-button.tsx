'use client';

import { updateJobAction } from '@/app/admin/all-jobs/[jobId]/actions';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { AdminRemoteSelect } from '@/components/layout-admin/admin-remote-select';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { AddJobOptions } from '@/lib/supabase/queries/add-job';
import type { JobActionDetail } from '@/lib/supabase/queries/job-action-detail';
import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';

const fieldClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[#303846]';

function initial(detail: JobActionDetail) {
  return {
    clientId: detail.job.client_id,
    title: detail.job.title,
    serviceId: detail.job.internal_service_id,
    priorityId: detail.job.priority_id,
    picId: detail.job.pic_id,
    description: detail.job.description ?? '',
    startDate: detail.job.start_date ?? '',
    estimatedEndDate: detail.job.estimated_end_date ?? '',
  };
}

export function EditJobButton({
  detail,
  options,
  modalOpen,
  onClose,
  onSaved,
  hideTrigger = false,
}: {
  detail: JobActionDetail;
  options: AddJobOptions;
  modalOpen?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = modalOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    if (!next) onClose?.();
  };
  const [form, setForm] = useState(() => initial(detail));
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const serviceLookup = useAdminPage<Array<{ value: string; workflowName: string; steps: string[] }>>(open && form.serviceId ? `/api/admin/lookups?kind=services&id=${form.serviceId}` : null);
  const selectedService = serviceLookup.data?.find((item) => item.value === form.serviceId);
  const serviceChanged = form.serviceId !== detail.job.internal_service_id;
  const priorities = options.priorities.some((item) => item.id === detail.job.priority_id)
    ? options.priorities
    : [{ id: detail.job.priority_id, name: `${detail.summary.priority} (current)` }, ...options.priorities];

  function setField<Key extends keyof ReturnType<typeof initial>>(key: Key, value: ReturnType<typeof initial>[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'serviceId') setConfirmReset(false);
    setError('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    if (serviceChanged && !confirmReset) {
      setError('Konfirmasi pengulangan workflow terlebih dahulu.');
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        const result = await updateJobAction({ jobId: detail.job.id, version: detail.job.version, ...form });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setOpen(false);
        onSaved?.();
        router.refresh();
      } catch {
        setError('Koneksi terputus. Muat ulang halaman sebelum mencoba lagi.');
      }
    });
  }

  return (
    <>
      {!hideTrigger && detail.canManage && detail.statusCode !== 'COMPLETED' ? (
        <button
          type="button"
          onClick={() => {
            setForm(initial(detail));
            setConfirmReset(false);
            setError('');
            setOpen(true);
          }}
          className="inline-flex h-8 items-center gap-2 rounded bg-[#9F1010] px-6 text-[11px] font-semibold text-white hover:bg-[#7E0C0C]"
        >
          Edit Jobs <Pencil className="size-3.5" />
        </button>
      ) : null}
      <AdminModal
        open={open}
        onClose={() => {
          if (!isPending) setOpen(false);
        }}
        title="Edit Job"
        description="Perubahan akan tersimpan pada Job ini. Status diubah terpisah pada Job Information."
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <AdminRemoteSelect kind="clients" label="Client *" value={form.clientId} initialLabel={detail.summary.client} onChange={(value) => setField('clientId', value)} />
          </div>
          <div>
            <label htmlFor="edit-job-title" className={labelClass}>
              Judul Job *
            </label>
            <input id="edit-job-title" required maxLength={240} className={fieldClass} value={form.title} onChange={(event) => setField('title', event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <AdminRemoteSelect kind="services" label="Internal Service *" value={form.serviceId} initialLabel={detail.summary.internalService} onChange={(value) => setField('serviceId', value)} />
            </div>
            <div>
              <label htmlFor="edit-job-priority" className={labelClass}>
                Priority *
              </label>
              <select id="edit-job-priority" required className={fieldClass} value={form.priorityId} onChange={(event) => setField('priorityId', event.target.value)}>
                {priorities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedService ? (
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F8F9FA] p-3 text-xs text-[#4B5563]">
              <strong>Workflow: {selectedService.workflowName}</strong>
              <p className="mt-1">{selectedService.steps.join(' → ')}</p>
            </div>
          ) : null}
          {serviceChanged ? (
            <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <input type="checkbox" checked={confirmReset} onChange={(event) => setConfirmReset(event.target.checked)} className="mt-0.5" />
              <span>Saya mengerti: mengganti Internal Service akan mengganti snapshot workflow dan mengulang progres tahapan Job ini. Histori sebelumnya tetap ada di Jobs Logging.</span>
            </label>
          ) : null}
          {detail.canChangePic ? (
            <div>
              <AdminRemoteSelect kind="profiles" label="PIC *" value={form.picId} initialLabel={detail.summary.pic} onChange={(value) => setField('picId', value)} />
            </div>
          ) : (
            <p className="text-xs text-[#68717E]">PIC: {detail.summary.pic}. Hanya admin yang dapat mengganti PIC.</p>
          )}
          <div>
            <label htmlFor="edit-job-description" className={labelClass}>
              Deskripsi
            </label>
            <textarea id="edit-job-description" className={`${fieldClass} h-24 py-2`} maxLength={5000} value={form.description} onChange={(event) => setField('description', event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-job-start" className={labelClass}>
                Tanggal mulai
              </label>
              <input id="edit-job-start" type="date" className={fieldClass} value={form.startDate} onChange={(event) => setField('startDate', event.target.value)} />
            </div>
            <div>
              <label htmlFor="edit-job-end" className={labelClass}>
                Estimasi selesai
              </label>
              <input
                id="edit-job-end"
                type="date"
                min={form.startDate || undefined}
                className={fieldClass}
                value={form.estimatedEndDate}
                onChange={(event) => setField('estimatedEndDate', event.target.value)}
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 border-t border-[#E7E9ED] pt-4">
            <button type="button" disabled={isPending} onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-[#4B5563] hover:bg-gray-100">
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending || !form.clientId || !form.serviceId || !form.picId || (serviceChanged && !confirmReset)}
              className="rounded-lg bg-[#8C1010] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
