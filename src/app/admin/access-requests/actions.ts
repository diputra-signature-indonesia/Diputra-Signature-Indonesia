'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ASSIGNABLE_ADMIN_ROLES, type UserRole } from '@/types/auth-role';
import { revalidatePath } from 'next/cache';

export type AccessRequestActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAssignableRole(role: string): role is UserRole {
  return ASSIGNABLE_ADMIN_ROLES.some((option) => option.value === role);
}

export async function approveAccessRequestAction(userId: string, role: string): Promise<AccessRequestActionResult> {
  if (!UUID_PATTERN.test(userId) || !isAssignableRole(role)) {
    return { ok: false, message: 'Request atau role tidak valid.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('approve_admin_access_request', {
    p_user_id: userId,
    p_role: role,
  });

  if (error) {
    return {
      ok: false,
      message: error.message.includes('already been reviewed') ? 'Request ini sudah diproses oleh reviewer lain.' : 'Approval gagal. Pastikan Anda masih memiliki akses super admin.',
    };
  }

  revalidatePath('/admin/access-requests');
  return { ok: true, message: 'Akses berhasil disetujui.' };
}

export async function rejectAccessRequestAction(userId: string, rejectionReason: string): Promise<AccessRequestActionResult> {
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
    return {
      ok: false,
      message: error.message.includes('already been reviewed') ? 'Request ini sudah diproses oleh reviewer lain.' : 'Penolakan gagal. Pastikan Anda masih memiliki akses super admin.',
    };
  }

  revalidatePath('/admin/access-requests');
  return { ok: true, message: 'Permintaan akses ditolak.' };
}
