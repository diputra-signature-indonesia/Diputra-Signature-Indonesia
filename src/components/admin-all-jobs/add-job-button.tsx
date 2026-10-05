'use client';

import { createJobAction, type CreateJobInput } from '@/app/admin/all-jobs/actions';
import { AdminRemoteSelect } from '@/components/layout-admin/admin-remote-select';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { AddJobOptions } from '@/lib/supabase/queries/add-job';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';

const fieldClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10 disabled:bg-gray-100';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[#303846]';
const emptyForm: CreateJobInput = {
  clientId: '',
  newClientType: 'COMPANY',
  newClientName: '',
  title: '',
  serviceId: '',
  priorityId: '',
  picId: null,
  description: '',
  startDate: '',
  estimatedEndDate: '',
};

export function AddJobButton({ options }: { options: AddJobOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateJobInput>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();
  const serviceLookup = useAdminPage<Array<{ value: string; label: string; workflowName: string; steps: string[] }>>(
    open && form.serviceId ? `/api/admin/lookups?kind=services&id=${form.serviceId}` : null
  );
  const selectedService = serviceLookup.data?.find((service) => service.value === form.serviceId);
  const canAssignPic = options.actor.role === 'admin' || options.actor.role === 'super_admin';
  const ready = options.priorities.length > 0;

  function setField<K extends keyof CreateJobInput>(key: K, value: CreateJobInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        const result = await createJobAction(form);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setOpen(false);
        setForm(emptyForm);
        setSuccess('Job berhasil disimpan.');
        router.refresh();
      } catch {
        setError('Koneksi terputus saat menyimpan Job. Periksa data sebelum mencoba lagi.');
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-2 rounded bg-[#9F1010] px-6 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:ring-2 focus-visible:ring-[#8C1010]/35 focus-visible:outline-none"
      >
        Add Jobs <Plus aria-hidden="true" className="size-3.5" />
      </button>
      {success ? (
        <div role="status" className="fixed right-5 bottom-5 z-[60] max-w-sm rounded-lg border border-green-200 bg-white p-4 text-sm text-[#25452D] shadow-lg">
          <button type="button" onClick={() => setSuccess('')} className="float-right ml-3 font-semibold">
            ×
          </button>
          {success}
        </div>
      ) : null}
      <AdminModal
        open={open}
        onClose={() => {
          if (!isPending) setOpen(false);
        }}
        title="Tambah Job"
        description="Pilih Client yang ada atau buat Client baru. Workflow mengikuti Internal Service."
        size="lg"
      >
        <form id="add-job-form" onSubmit={submit} className="space-y-4">
          {!ready ? (
            <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Belum ada Internal Service dengan workflow aktif atau Priority aktif. Lengkapi Master Data terlebih dahulu.
            </p>
          ) : null}
          <div>
            {form.clientId !== 'new' ? (
              <AdminRemoteSelect size="md" kind="clients" label="Client *" value={form.clientId} onChange={(value) => setField('clientId', value)} />
            ) : (
              <p className="text-sm">Client baru</p>
            )}
            <button type="button" onClick={() => setField('clientId', form.clientId === 'new' ? '' : 'new')} className="mt-2 text-xs font-semibold text-[#8C1010]">
              {form.clientId === 'new' ? 'Pilih Client yang ada' : '+ Tambah Client baru'}
            </button>
          </div>
          {form.clientId === 'new' ? (
            <div className="grid gap-3 rounded-lg border border-[#E4E7EC] bg-[#FAFAFB] p-3 sm:grid-cols-2">
              <div>
                <label htmlFor="add-job-client-type" className={labelClass}>
                  Jenis Client *
                </label>
                <select
                  id="add-job-client-type"
                  className={fieldClass}
                  value={form.newClientType ?? 'COMPANY'}
                  onChange={(event) => setField('newClientType', event.target.value as CreateJobInput['newClientType'])}
                >
                  <option value="COMPANY">Perusahaan</option>
                  <option value="INDIVIDUAL">Perorangan</option>
                </select>
              </div>
              <div>
                <label htmlFor="add-job-client-name" className={labelClass}>
                  Nama Client *
                </label>
                <input
                  id="add-job-client-name"
                  className={fieldClass}
                  required
                  maxLength={200}
                  value={form.newClientName}
                  onChange={(event) => setField('newClientName', event.target.value)}
                  placeholder="Nama perusahaan atau individu"
                />
              </div>
            </div>
          ) : null}
          <div>
            <label htmlFor="add-job-title" className={labelClass}>
              Judul Job *
            </label>
            <input
              id="add-job-title"
              className={fieldClass}
              required
              maxLength={240}
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              placeholder="Contoh: Registrasi NPWP"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminRemoteSelect size="md" kind="services" label="Internal Service *" value={form.serviceId} onChange={(value) => setField('serviceId', value)} />
            <div>
              <label htmlFor="add-job-priority" className={labelClass}>
                Priority *
              </label>
              <select id="add-job-priority" className={fieldClass} required value={form.priorityId} onChange={(event) => setField('priorityId', event.target.value)}>
                <option value="">Pilih Priority</option>
                {options.priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {serviceLookup.error ? (
            <p role="alert" className="text-sm text-red-700">
              {serviceLookup.error}
            </p>
          ) : null}
          {selectedService ? (
            <div className="rounded-lg border border-[#E4E7EC] bg-[#F8F9FA] p-3 text-xs text-[#4B5563]">
              <strong className="text-[#303846]">Workflow: {selectedService.workflowName}</strong>
              <p className="mt-1">{selectedService.steps.join(' → ')}</p>
            </div>
          ) : null}
          {canAssignPic ? (
            <AdminRemoteSelect
              size="md"
              kind="profiles"
              label="PIC *"
              value={form.picId ?? options.actor.id}
              initialLabel={options.actor.name}
              onChange={(value) => setField('picId', value || null)}
            />
          ) : (
            <p className="text-xs text-[#68717E]">PIC: {options.actor.name} (otomatis)</p>
          )}
          <div>
            <label htmlFor="add-job-description" className={labelClass}>
              Deskripsi
            </label>
            <textarea
              id="add-job-description"
              className={`${fieldClass} h-24 py-2`}
              maxLength={5000}
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Rincian pekerjaan (opsional)"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="add-job-start" className={labelClass}>
                Tanggal mulai
              </label>
              <input id="add-job-start" type="date" className={fieldClass} value={form.startDate} onChange={(event) => setField('startDate', event.target.value)} />
            </div>
            <div>
              <label htmlFor="add-job-end" className={labelClass}>
                Estimasi selesai
              </label>
              <input
                id="add-job-end"
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
              disabled={isPending || !ready || !form.clientId || !form.serviceId || serviceLookup.loading || Boolean(serviceLookup.error) || !selectedService?.steps.length}
              className="rounded-lg bg-[#8C1010] px-5 py-2 text-sm font-semibold text-white hover:bg-[#700C0C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Menyimpan…' : 'Simpan Job'}
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
}
