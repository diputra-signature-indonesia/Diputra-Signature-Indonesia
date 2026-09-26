'use server';

import { requireActiveAdmin, requireActiveSuperAdmin } from '@/lib/auth/admin-access';
import { PUBLIC_CACHE_TAGS } from '@/lib/public-cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { PendingAccessRequest } from '@/lib/supabase/queries/user-management';
import { ASSIGNABLE_ADMIN_ROLES, type UserRole } from '@/types/auth-role';
import { revalidatePath, updateTag } from 'next/cache';

export type UserManagementActionResult = { ok: true; message: string } | { ok: false; message: string };
export type SearchAccessRequestsResult = { ok: true; requests: PendingAccessRequest[] } | { ok: false; message: string };
export type SaveTeamMemberInput = {
  profileId: string;
  fullName: string;
  jobTitleId: string;
  avatarUrl: string;
  shortBio: string;
  isVisible: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAssignableRole(role: string): role is UserRole {
  return ASSIGNABLE_ADMIN_ROLES.some((option) => option.value === role);
}

function refreshUserManagement() {
  revalidatePath('/admin/access-requests');
}

export async function saveTeamMemberAction(input: SaveTeamMemberInput): Promise<UserManagementActionResult> {
  const context = await requireActiveAdmin();
  if (context.role !== 'admin' && context.role !== 'super_admin') {
    return { ok: false, message: 'Hanya admin atau super admin yang dapat mengelola profil publik.' };
  }

  const fullName = input.fullName.trim();
  const avatarUrl = input.avatarUrl.trim();
  const shortBio = input.shortBio.trim();
  if (!UUID_PATTERN.test(input.profileId) || !fullName || fullName.length > 160) {
    return { ok: false, message: 'Nama anggota tim wajib diisi dan maksimal 160 karakter.' };
  }
  if (input.jobTitleId && !UUID_PATTERN.test(input.jobTitleId)) {
    return { ok: false, message: 'Job title yang dipilih tidak valid.' };
  }
  if (input.isVisible && !input.jobTitleId) {
    return { ok: false, message: 'Pilih Job title sebelum menampilkan anggota tim di About page.' };
  }
  if (avatarUrl.length > 2048 || shortBio.length > 1000) {
    return { ok: false, message: 'URL foto atau bio melebihi batas karakter.' };
  }
  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('invalid protocol');
    } catch {
      return { ok: false, message: 'URL foto publik tidak valid.' };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('save_team_member_profile', {
    p_profile_id: input.profileId,
    p_full_name: fullName,
    p_job_title_id: input.jobTitleId || null,
    p_avatar_url: avatarUrl || null,
    p_short_bio: shortBio || null,
    p_is_visible: input.isVisible,
  } as never);

  if (error) {
    if (error.code === '23503') return { ok: false, message: 'Job title tidak aktif atau sudah tidak tersedia.' };
    if (error.code === '23514') return { ok: false, message: 'Lengkapi Job title sebelum profil dipublikasikan.' };
    if (error.code === '42501') return { ok: false, message: 'Anda tidak memiliki izin untuk mengelola profil publik.' };
    return { ok: false, message: 'Profil publik gagal disimpan. Muat ulang halaman lalu coba kembali.' };
  }

  revalidatePath('/admin/access-requests');
  revalidatePath('/about');
  updateTag(PUBLIC_CACHE_TAGS.team);
  return { ok: true, message: input.isVisible ? 'Profil anggota tim disimpan dan ditampilkan di About page.' : 'Profil anggota tim disimpan sebagai hidden.' };
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
