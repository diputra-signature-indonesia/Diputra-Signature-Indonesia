'use server';

import type { MasterDataFormCategoryId, MasterDataFormValues } from '@/components/admin-master-data/master-data-form-modal';
import type { MasterDataCategoryId } from '@/data/admin-master-data/master-data';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.generated';
import { revalidatePath } from 'next/cache';

export type MasterDataActionResult = { ok: true; message: string } | { ok: false; message: string };

export type SaveMasterDataInput = {
  categoryId: MasterDataFormCategoryId;
  id?: string;
  expectedVersion?: number;
  values: MasterDataFormValues;
};

export type ArchiveMasterDataInput = {
  categoryId: Exclude<MasterDataCategoryId, 'service-categories'>;
  id: string;
  expectedVersion: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[A-Z][A-Z0-9_]+$/;
const COLOR_PATTERN = /^#[0-9A-F]{6}$/;

function isManagerRole(role: string) {
  return role === 'admin' || role === 'super_admin';
}

function normalizeValues(values: MasterDataFormValues): MasterDataFormValues {
  return {
    ...values,
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    color: values.color.trim().toUpperCase(),
    summary: values.summary.trim(),
    workflowTemplateId: values.workflowTemplateId?.trim() || '',
    steps: values.steps.map((step) => ({ ...step, name: step.name.trim() })),
  };
}

function validateSaveInput(input: SaveMasterDataInput): string | null {
  const { categoryId, id, expectedVersion, values } = input;
  const maxCodeLength = categoryId === 'priorities' || categoryId === 'job-statuses' || categoryId === 'task-statuses' ? 50 : 80;
  const maxNameLength = categoryId === 'priorities' || categoryId === 'job-statuses' || categoryId === 'task-statuses' ? 100 : 160;

  if (id && (!UUID_PATTERN.test(id) || !Number.isInteger(expectedVersion) || (expectedVersion ?? 0) < 1)) {
    return 'Data yang akan diperbarui tidak valid. Muat ulang halaman lalu coba lagi.';
  }
  if (!CODE_PATTERN.test(values.code) || values.code.length > maxCodeLength) {
    return `Code wajib berupa huruf kapital, angka, atau underscore dengan panjang maksimal ${maxCodeLength} karakter.`;
  }
  if (!values.name || values.name.length > maxNameLength) {
    return `Nama wajib diisi dengan panjang maksimal ${maxNameLength} karakter.`;
  }
  if (values.summary.length > 500) {
    return 'Deskripsi maksimal 500 karakter.';
  }

  if (categoryId === 'priorities' || categoryId === 'job-statuses' || categoryId === 'task-statuses') {
    if (!COLOR_PATTERN.test(values.color)) return 'Warna harus menggunakan format hex, misalnya #8C1010.';
    if (!Number.isInteger(values.sortOrder) || values.sortOrder < 0) return 'Sort order harus berupa angka bulat nol atau lebih.';
  }

  if (categoryId === 'internal-services' && values.workflowTemplateId && !UUID_PATTERN.test(values.workflowTemplateId)) {
    return 'Workflow template yang dipilih tidak valid.';
  }

  if (categoryId === 'workflow-templates') {
    if (values.steps.length < 1 || values.steps.length > 100 || values.steps.some((step) => !step.name || step.name.length > 160)) {
      return 'Workflow harus memiliki 1–100 step dan setiap nama step wajib diisi.';
    }
  }

  return null;
}

function actionError(error: { code?: string; message: string }): MasterDataActionResult {
  if (error.code === '42501') return { ok: false, message: 'Hanya admin atau super admin aktif yang dapat mengubah Master Data.' };
  if (error.code === '23505') return { ok: false, message: 'Code tersebut sudah digunakan. Gunakan code lain.' };
  if (error.code === '40001') return { ok: false, message: 'Data sudah diubah oleh pengguna lain. Muat ulang halaman lalu coba kembali.' };
  if (error.code === '23503') return { ok: false, message: 'Data masih digunakan oleh data aktif lain dan belum dapat dinonaktifkan.' };
  if (error.code === '55000' && error.message.includes('immutable')) {
    return { ok: false, message: 'Workflow yang sudah digunakan oleh Job tidak dapat diubah. Buat workflow baru untuk susunan step yang berbeda.' };
  }
  if (error.code === '55000') return { ok: false, message: 'Operasi ini tidak diperbolehkan untuk data sistem atau kondisi data saat ini.' };
  if (error.code === 'P0002') return { ok: false, message: 'Data tidak ditemukan. Muat ulang halaman lalu coba kembali.' };

  return { ok: false, message: 'Perubahan gagal disimpan. Periksa data lalu coba kembali.' };
}

export async function saveMasterDataAction(rawInput: SaveMasterDataInput): Promise<MasterDataActionResult> {
  const context = await requireActiveAdmin();
  if (!isManagerRole(context.role)) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengubah Master Data.' };

  const input = { ...rawInput, values: normalizeValues(rawInput.values) };
  const validationMessage = validateSaveInput(input);
  if (validationMessage) return { ok: false, message: validationMessage };

  const { categoryId, id, expectedVersion, values } = input;
  const supabase = await createSupabaseServerClient();
  let error: { code?: string; message: string } | null = null;

  if (categoryId === 'priorities') {
    ({ error } = await supabase.rpc('save_priority', {
      p_id: id ?? null,
      p_expected_version: expectedVersion ?? null,
      p_code: values.code,
      p_name: values.name,
      p_color: values.color,
      p_sort_order: values.sortOrder,
      p_is_active: values.isActive,
    } as never));
  } else if (categoryId === 'job-statuses') {
    ({ error } = await supabase.rpc('save_job_status', {
      p_id: id ?? null,
      p_expected_version: expectedVersion ?? null,
      p_code: values.code,
      p_name: values.name,
      p_color: values.color,
      p_sort_order: values.sortOrder,
      p_is_active: values.isActive,
    } as never));
  } else if (categoryId === 'task-statuses') {
    ({ error } = await supabase.rpc('save_task_status', {
      p_id: id ?? null,
      p_expected_version: expectedVersion ?? null,
      p_code: values.code,
      p_name: values.name,
      p_color: values.color,
      p_sort_order: values.sortOrder,
      p_is_active: values.isActive,
    } as never));
  } else if (categoryId === 'internal-services') {
    ({ error } = await supabase.rpc('save_internal_service', {
      p_id: id ?? null,
      p_expected_version: expectedVersion ?? null,
      p_code: values.code,
      p_name: values.name,
      p_summary: values.summary || null,
      p_workflow_template_id: values.workflowTemplateId || null,
      p_is_active: values.isActive,
    } as never));
  } else {
    const steps = values.steps.map((step) => ({ name: step.name, description: null })) as Json;
    ({ error } = await supabase.rpc('save_workflow_template', {
      p_id: id ?? null,
      p_expected_version: expectedVersion ?? null,
      p_code: values.code,
      p_name: values.name,
      p_description: values.summary || null,
      p_steps: steps,
      p_is_active: values.isActive,
    } as never));
  }

  if (error) return actionError(error);

  revalidatePath('/admin/master-data');
  return { ok: true, message: id ? 'Master Data berhasil diperbarui.' : 'Master Data berhasil ditambahkan.' };
}

export async function archiveMasterDataAction(input: ArchiveMasterDataInput): Promise<MasterDataActionResult> {
  const context = await requireActiveAdmin();
  if (!isManagerRole(context.role)) return { ok: false, message: 'Hanya admin atau super admin yang dapat mengubah Master Data.' };
  if (!UUID_PATTERN.test(input.id) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
    return { ok: false, message: 'Data yang akan dinonaktifkan tidak valid.' };
  }

  const entityByCategory: Record<ArchiveMasterDataInput['categoryId'], string> = {
    priorities: 'PRIORITY',
    'internal-services': 'INTERNAL_SERVICE',
    'job-statuses': 'JOB_STATUS',
    'task-statuses': 'TASK_STATUS',
    'workflow-templates': 'WORKFLOW_TEMPLATE',
  };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_master_data_active', {
    p_entity: entityByCategory[input.categoryId],
    p_id: input.id,
    p_expected_version: input.expectedVersion,
    p_is_active: false,
  } as never);

  if (error) return actionError(error);

  revalidatePath('/admin/master-data');
  return { ok: true, message: 'Data berhasil dinonaktifkan dan histori tetap dipertahankan.' };
}
