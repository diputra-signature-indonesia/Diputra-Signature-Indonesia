import type { UserRole } from './auth-role';

export type OwnAccountDetails = {
  displayName: string | null;
  email: string | null;
  role: UserRole;
  publicProfile: {
    fullName: string;
    nickname: string | null;
    jobTitle: string | null;
    shortBio: string | null;
    avatarUrl: string | null;
    isVisible: boolean;
  } | null;
};
