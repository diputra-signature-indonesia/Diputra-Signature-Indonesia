'use server';

import { requireActiveSuperAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { PendingAccessRequest } from '@/lib/supabase/queries/user-management';
import { ASSIGNABLE_ADMIN_ROLES, type UserRole } from '@/types/auth-role';
import { revalidatePath } from 'next/cache';

export type UserManagementActionResult = { ok: true; message: string } | { ok: false; message: string };
export type SearchAccessRequestsResult = { ok: true; requests: PendingAccessRequest[] } | { ok: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAssignableRole(role: string): role is UserRole {
  return ASSIGNABLE_ADMIN_ROLES.some((option) => option.value === role);
}

function refreshUserManagement() {
  revalidatePath('/admin/access-requests');
}

function mutationError(message: string, fallback: string) {
  if (message.includes('cannot change their own role')) return 'Role akun yang sedang digunakan tidak dapat diubah.';
  if (message.includes('cannot deactivate their own profile')) return 'Akun yang sedang digunakan tidak dapat dinonaktifkan.';
  if (message.includes('cannot delete their own profile')) return 'Akun yang sedang digunakan tidak dapat dihapus.';
  if (message.includes('not found')) return 'Data pengguna tidak ditemukan atau sudah berubah.';
  return fallback;
}

export async function searchPendingAccessRequestsAction(search: string): Promise<SearchAccessRequestsResult> {
  await requireActiveSuperAdmin();
  const normalizedSearch = search.trim();
  if (normalizedSearch.length > 160) return { ok: false, message: 'Pencarian maksimal 160 karakter.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('list_pending_admin_access_requests', {
    p_search: normalizedSearch || undefined,
    p_limit: 10,
  });

  if (error) return { ok: false, message: 'Permintaan akses tidak dapat dimuat.' };
  return { ok: true, requests: data ?? [] };
}

export async function approveAccessRequestAction(userId: string, role: string): Promise<UserManagementActionResult> {
  await requireActiveSuperAdmin();
  if (!UUID_PATTERN.test(userId) || !isAssignableRole(role)) {
    return { ok: false, message: 'Pilih role sebelum menyetujui permintaan.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('approve_admin_access_request', { p_user_id: userId, p_role: role });
  if (error) {
    return { ok: false, message: error.message.includes('already been reviewed') ? 'Request ini sudah diproses oleh reviewer lain.' : 'Approval gagal. Silakan coba kembali.' };
  }

  refreshUserManagement();
  return { ok: true, message: 'Akses pengguna berhasil disetujui.' };
}

export async function rejectAccessRequestAction(userId: string, rejectionReason: string): Promise<UserManagementActionResult> {
  await requireActiveSuperAdmin();
  const normalizedReason = rejectionReason.trim();
  if (!UUID_PATTERN.test(userId) || normalizedReason.length > 1000) {
    return { ok: false, message: 'Request atau alasan penolakan tidak valid.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('reject_admin_access_request', {
    p_user_id: userId,
    p_rejection_reason: normalizedReason || undefined,
  });
  if (error) {
    return { ok: false, message: error.message.includes('already been reviewed') ? 'Request ini sudah diproses oleh reviewer lain.' : 'Penolakan gagal. Silakan coba kembali.' };
  }

  refreshUserManagement();
  return { ok: true, message: 'Permintaan akses ditolak.' };
}

export async function updateProfileRoleAction(profileId: string, role: string): Promise<UserManagementActionResult> {
  await requireActiveSuperAdmin();
  if (!UUID_PATTERN.test(profileId) || !isAssignableRole(role)) return { ok: false, message: 'Pengguna atau role tidak valid.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_profile_role', { p_profile_id: profileId, p_role: role });
  if (error) return { ok: false, message: mutationError(error.message, 'Role pengguna gagal diperbarui.') };

  refreshUserManagement();
  return { ok: true, message: 'Role pengguna berhasil diperbarui.' };
}

export async function setProfileActiveAction(profileId: string, isActive: boolean): Promise<UserManagementActionResult> {
  await requireActiveSuperAdmin();
  if (!UUID_PATTERN.test(profileId)) return { ok: false, message: 'Pengguna tidak valid.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_profile_active', { p_profile_id: profileId, p_is_active: isActive });
  if (error) return { ok: false, message: mutationError(error.message, `Pengguna gagal ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`) };

  refreshUserManagement();
  return { ok: true, message: `Pengguna berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.` };
}

export async function softDeleteProfileAction(profileId: string): Promise<UserManagementActionResult> {
  await requireActiveSuperAdmin();
  if (!UUID_PATTERN.test(profileId)) return { ok: false, message: 'Pengguna tidak valid.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('soft_delete_profile', { p_profile_id: profileId });
  if (error) return { ok: false, message: mutationError(error.message, 'Pengguna gagal dihapus.') };

  refreshUserManagement();
  return { ok: true, message: 'Pengguna dihapus dari daftar aktif. Histori terkait tetap tersimpan.' };
}
