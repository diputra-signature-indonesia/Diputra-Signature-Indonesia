import type { UserRole } from '@/types/auth-role';

export function jobActionPermissions(input: { role: UserRole; actorId: string; picId?: string; statusCode: string; isDummy?: boolean }) {
  const admin = input.role === 'admin' || input.role === 'super_admin';
  const canManage = !input.isDummy && input.statusCode !== 'COMPLETED' && (admin || input.actorId === input.picId);
  return { canEdit: canManage, canChangeStatus: canManage, canTrash: admin && !input.isDummy };
}
