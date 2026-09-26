'use client';

import { createJobAction, type CreateJobInput } from '@/app/admin/all-jobs/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { AddJobOptions } from '@/lib/supabase/queries/add-job';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';

const fieldClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10 disabled:bg-gray-100';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[#303846]';
const emptyForm: CreateJobInput = {
  clientId: '', newClientType: 'COMPANY', newClientName: '', title: '', serviceId: '', priorityId: '', picId: null,
  description: '', startDate: '', estimatedEndDate: '',
};

export function AddJobButton({ options }: { options: AddJobOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateJobInput>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, startTransition] = useTransition();
  const selectedService = options.services.find((service) => service.id === form.serviceId);
  const canAssignPic = options.actor.role === 'admin' || options.actor.role === 'super_admin';
  const ready = options.services.length > 0 && options.priorities.length > 0;

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
        setSuccess('Job berhasil disimpan. Tabel All Jobs saat ini masih menggunakan data contoh; integrasi daftar Job akan menyusul.');
        router.refresh();
      } catch {
        setError('Koneksi terputus saat menyimpan Job. Periksa data sebelum mencoba lagi.');
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-2 rounded bg-[#9F1010] px-6 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35">
        Add Jobs <Plus aria-hidden="true" className="size-3.5" />
      </button>
      {success ? <div role="status" className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg border border-green-200 bg-white p-4 text-sm text-[#25452D] shadow-lg"><button type="button" onClick={() => setSuccess('')} className="float-right ml-3 font-semibold">×</button>{success}</div> : null}
      <AdminModal
        open={open}
        onClose={() => { if (!isPending) setOpen(false); }}
        title="Tambah Job"
        description="Pilih Client yang ada atau buat Client baru. Workflow mengikuti Internal Service."
        size="lg"
      >
        <form id="add-job-form" onSubmit={submit} className="space-y-4">
          {!ready ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Belum ada Internal Service dengan workflow aktif atau Priority aktif. Lengkapi Master Data terlebih dahulu.</p> : null}
          <div>
            <label htmlFor="add-job-client" className={labelClass}>Client <span className="text-red-600">*</span></label>
            <select id="add-job-client" required className={fieldClass} value={form.clientId} onChange={(event) => setField('clientId', event.target.value)}>
              <option value="">Pilih Client</option>
              {options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              <option value="new">+ Tambah Client baru</option>
            </select>
            {!options.clients.length ? <p className="mt-1 text-xs text-[#747E8B]">Belum ada Client. Pilih “Tambah Client baru” untuk membuat Job pertama.</p> : null}
          </div>
          {form.clientId === 'new' ? <div className="grid gap-3 rounded-lg border border-[#E4E7EC] bg-[#FAFAFB] p-3 sm:grid-cols-2">
            <div><label htmlFor="add-job-client-type" className={labelClass}>Jenis Client *</label><select id="add-job-client-type" className={fieldClass} value={form.newClientType ?? 'COMPANY'} onChange={(event) => setField('newClientType', event.target.value as CreateJobInput['newClientType'])}><option value="COMPANY">Perusahaan</option><option value="INDIVIDUAL">Perorangan</option></select></div>
            <div><label htmlFor="add-job-client-name" className={labelClass}>Nama Client *</label><input id="add-job-client-name" className={fieldClass} required maxLength={200} value={form.newClientName} onChange={(event) => setField('newClientName', event.target.value)} placeholder="Nama perusahaan atau individu" /></div>
          </div> : null}
          <div><label htmlFor="add-job-title" className={labelClass}>Judul Job *</label><input id="add-job-title" className={fieldClass} required maxLength={240} value={form.title} onChange={(event) => setField('title', event.target.value)} placeholder="Contoh: Registrasi NPWP" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="add-job-service" className={labelClass}>Internal Service *</label><select id="add-job-service" className={fieldClass} required value={form.serviceId} onChange={(event) => setField('serviceId', event.target.value)}><option value="">Pilih Service</option>{options.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></div>
            <div><label htmlFor="add-job-priority" className={labelClass}>Priority *</label><select id="add-job-priority" className={fieldClass} required value={form.priorityId} onChange={(event) => setField('priorityId', event.target.value)}><option value="">Pilih Priority</option>{options.priorities.map((priority) => <option key={priority.id} value={priority.id}>{priority.name}</option>)}</select></div>
          </div>
          {selectedService ? <div className="rounded-lg border border-[#E4E7EC] bg-[#F8F9FA] p-3 text-xs text-[#4B5563]"><strong className="text-[#303846]">Workflow: {selectedService.workflowName}</strong><p className="mt-1">{selectedService.steps.join(' → ')}</p></div> : null}
          {canAssignPic ? <div><label htmlFor="add-job-pic" className={labelClass}>PIC *</label><select id="add-job-pic" className={fieldClass} value={form.picId ?? options.actor.id} onChange={(event) => setField('picId', event.target.value)}>{options.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}</select></div> : <p className="text-xs text-[#68717E]">PIC: {options.actor.name} (otomatis)</p>}
          <div><label htmlFor="add-job-description" className={labelClass}>Deskripsi</label><textarea id="add-job-description" className={`${fieldClass} h-24 py-2`} maxLength={5000} value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Rincian pekerjaan (opsional)" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="add-job-start" className={labelClass}>Tanggal mulai</label><input id="add-job-start" type="date" className={fieldClass} value={form.startDate} onChange={(event) => setField('startDate', event.target.value)} /></div>
            <div><label htmlFor="add-job-end" className={labelClass}>Estimasi selesai</label><input id="add-job-end" type="date" min={form.startDate || undefined} className={fieldClass} value={form.estimatedEndDate} onChange={(event) => setField('estimatedEndDate', event.target.value)} /></div>
          </div>
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-3 border-t border-[#E7E9ED] pt-4"><button type="button" disabled={isPending} onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-[#4B5563] hover:bg-gray-100">Batal</button><button type="submit" disabled={isPending || !ready} className="rounded-lg bg-[#8C1010] px-5 py-2 text-sm font-semibold text-white hover:bg-[#700C0C] disabled:cursor-not-allowed disabled:opacity-50">{isPending ? 'Menyimpan…' : 'Simpan Job'}</button></div>
        </form>
      </AdminModal>
    </>
  );
}
