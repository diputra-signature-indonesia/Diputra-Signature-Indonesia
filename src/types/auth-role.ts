import type { Enums } from '@/types/database.generated';

export type UserRole = Enums<'role'>;

export const ADMIN_ROLES = ['super_admin', 'admin', 'staff'] as const satisfies readonly UserRole[];

export const ASSIGNABLE_ADMIN_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
] as const satisfies ReadonlyArray<{ value: UserRole; label: string }>;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && ADMIN_ROLES.some((role) => role === value);
}
