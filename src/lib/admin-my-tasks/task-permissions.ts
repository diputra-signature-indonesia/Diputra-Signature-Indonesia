import type { UserRole } from '@/types/auth-role';

// UI hint only: place_task_on_board rechecks these permissions in the database.
export function canChangeMyTaskStatus(input: { role: UserRole; actorId: string; picId: string; assigneeId: string | null; jobStatusCode: string; archived?: boolean }) {
  if (input.archived || input.jobStatusCode === 'COMPLETED') return false;
  return input.role === 'admin' || input.role === 'super_admin' || input.actorId === input.picId || input.actorId === input.assigneeId;
}
