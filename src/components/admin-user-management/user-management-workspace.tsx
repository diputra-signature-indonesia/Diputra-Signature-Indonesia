'use client';

import {
  approveAccessRequestAction,
  rejectAccessRequestAction,
  searchPendingAccessRequestsAction,
  saveTeamMemberAction,
  setProfileActiveAction,
  softDeleteProfileAction,
  updateProfileRoleAction,
} from '@/app/admin/access-requests/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { ManagedProfile, PendingAccessRequest, TeamJobTitleOption } from '@/lib/supabase/queries/user-management';
import { ASSIGNABLE_ADMIN_ROLES, type UserRole } from '@/types/auth-role';
import { Avatar } from '@mui/material';
import { BadgeCheck, Eye, EyeOff, Pencil, Power, PowerOff, Search, Trash2, UserRoundCheck } from 'lucide-react';
import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Notice = { tone: 'success' | 'error'; message: string };
type Confirmation = { type: 'activate' | 'deactivate' | 'delete'; profile: ManagedProfile };

type UserManagementWorkspaceProps = {
  currentUserId: string;
  profiles: ManagedProfile[];
  initialRequests: PendingAccessRequest[];
  initialPendingRequestCount: number;
  jobTitles: TeamJobTitleOption[];
  canManageUsers: boolean;
};

const roleStyles: Record<UserRole, string> = {
  super_admin: 'border-[#E8B4B4] bg-[#FFF1F1] text-[#9F1010]',
  admin: 'border-[#B8C8E5] bg-[#F0F5FF] text-[#245293]',
  staff: 'border-[#D9DDE3] bg-[#F5F6F8] text-[#586273]',
};

function roleLabel(role: UserRole) {
  return ASSIGNABLE_ADMIN_ROLES.find((option) => option.value === role)?.label ?? role;
}

function displayName(profile: Pick<ManagedProfile, 'display_name' | 'email'>) {
  return profile.display_name?.trim() || profile.email;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(value));
}

function formatRequestDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  }).format(new Date(value));
}

export function UserManagementWorkspace({ currentUserId, profiles, initialRequests, initialPendingRequestCount, jobTitles, canManageUsers }: UserManagementWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requests, setRequests] = useState(initialRequests);
  const [requestCount, setRequestCount] = useState(initialPendingRequestCount);
  const [searchValue, setSearchValue] = useState('');
  const [roles, setRoles] = useState<Record<string, UserRole | ''>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingAccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editing, setEditing] = useState<ManagedProfile | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>('staff');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [teamEditing, setTeamEditing] = useState<ManagedProfile | null>(null);
  const [teamFullName, setTeamFullName] = useState('');
  const [teamJobTitleId, setTeamJobTitleId] = useState('');
  const [teamAvatarUrl, setTeamAvatarUrl] = useState('');
  const [teamShortBio, setTeamShortBio] = useState('');
  const [teamIsVisible, setTeamIsVisible] = useState(false);

  const finishMutation = (result: { ok: boolean; message: string }, onSuccess?: () => void) => {
    setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
    setPendingId(null);
    if (result.ok) {
      onSuccess?.();
      router.refresh();
    }
  };

  const searchRequests = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await searchPendingAccessRequestsAction(searchValue);
      if (result.ok) setRequests(result.requests);
      else setNotice({ tone: 'error', message: result.message });
    });
  };

  const approve = (request: PendingAccessRequest) => {
    const role = roles[request.user_id];
    if (!role) return;
    setPendingId(request.user_id);
    setNotice(null);
    startTransition(async () => {
      const result = await approveAccessRequestAction(request.user_id, role);
      finishMutation(result, () => {
        setRequests((current) => current.filter((item) => item.user_id !== request.user_id));
        setRequestCount((current) => Math.max(0, current - 1));
      });
    });
  };

  const reject = () => {
    if (!rejecting) return;
    setPendingId(rejecting.user_id);
    setNotice(null);
    startTransition(async () => {
      const result = await rejectAccessRequestAction(rejecting.user_id, rejectionReason);
      finishMutation(result, () => {
        setRequests((current) => current.filter((item) => item.user_id !== rejecting.user_id));
        setRequestCount((current) => Math.max(0, current - 1));
        setRejecting(null);
        setRejectionReason('');
        setRequestModalOpen(true);
      });
    });
  };

  const cancelRejection = () => {
    setRejecting(null);
    setRejectionReason('');
    setRequestModalOpen(true);
  };

  const saveRole = () => {
    if (!editing) return;
    setPendingId(editing.id);
    setNotice(null);
    startTransition(async () => {
      const result = await updateProfileRoleAction(editing.id, editingRole);
      finishMutation(result, () => setEditing(null));
    });
  };

  const applyConfirmation = () => {
    if (!confirmation) return;
    const { profile, type } = confirmation;
    setPendingId(profile.id);
    setNotice(null);
    startTransition(async () => {
      const result = type === 'delete' ? await softDeleteProfileAction(profile.id) : await setProfileActiveAction(profile.id, type === 'activate');
      finishMutation(result, () => setConfirmation(null));
    });
  };

  const openRoleEditor = (profile: ManagedProfile) => {
    setEditing(profile);
    setEditingRole(profile.role);
  };

  const openTeamEditor = (profile: ManagedProfile) => {
    setTeamEditing(profile);
    setTeamFullName(profile.teamMember?.full_name || displayName(profile));
    setTeamJobTitleId(profile.teamMember?.job_title_id ?? '');
    setTeamAvatarUrl(profile.teamMember?.avatar_url ?? profile.avatar_url ?? '');
    setTeamShortBio(profile.teamMember?.short_bio ?? '');
    setTeamIsVisible(profile.teamMember?.is_visible ?? false);
  };

  const saveTeamProfile = () => {
    if (!teamEditing) return;
    setPendingId(teamEditing.id);
    setNotice(null);
    startTransition(async () => {
      const result = await saveTeamMemberAction({
        profileId: teamEditing.id,
        fullName: teamFullName,
        jobTitleId: teamJobTitleId,
        avatarUrl: teamAvatarUrl,
        shortBio: teamShortBio,
        isVisible: teamIsVisible,
      });
      finishMutation(result, () => setTeamEditing(null));
    });
  };

  return (
    <main className="p-4 pb-20 sm:p-5 lg:p-6">
      {notice ? (
        <div
          role="status"
          className={`mb-4 rounded-lg border px-4 py-3 text-xs font-medium ${notice.tone === 'success' ? 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]' : 'border-[#F3B9B9] bg-[#FFF0F0] text-[#A51919]'}`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)]">
        <header className="flex items-center justify-between gap-4 border-b border-[#E4E7EB] px-4 py-5 sm:px-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#202938]">Users</h2>
            <p className="mt-1 text-xs leading-5 text-[#707988]">Manage roles and dashboard access for approved users.</p>
          </div>
          {canManageUsers ? (
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              aria-label={`Open access requests${requestCount ? `, ${requestCount} pending` : ''}`}
              title="Access requests"
              className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#E1BEBE] bg-white text-[#8C1010] transition hover:border-[#C98E8E] hover:bg-[#FFF7F7] focus-visible:ring-2 focus-visible:ring-[#8C1010]/25 focus-visible:outline-none"
            >
              <UserRoundCheck aria-hidden="true" className="size-5" strokeWidth={1.8} />
              {requestCount > 0 ? (
                <span className="absolute -top-2 -right-2 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#D92D20] px-1 text-[10px] leading-4 font-semibold text-white">
                  {requestCount > 99 ? '99+' : requestCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead className="bg-[#F8F9FA] text-[11px] font-semibold tracking-[0.04em] text-[#737B87] uppercase">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Public Profile</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E9ED]">
              {profiles.map((profile) => {
                const isSelf = profile.id === currentUserId;
                const loading = pendingId === profile.id;
                return (
                  <tr key={profile.id} className="transition hover:bg-[#FCFCFD]">
                    <td className="px-6 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar src={profile.avatar_url ?? undefined} alt={displayName(profile)} sx={{ width: 38, height: 38, fontSize: 13, bgcolor: '#A6192E' }}>
                          {displayName(profile).slice(0, 1).toUpperCase()}
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[#202938]">{displayName(profile)}</p>
                            {isSelf ? <span className="text-[10px] font-medium text-[#9F1010]">You</span> : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[#707988]">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${roleStyles[profile.role]}`}>{roleLabel(profile.role)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${profile.teamMember?.is_visible ? 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]' : 'border-[#D9DDE3] bg-[#F5F6F8] text-[#667181]'}`}
                      >
                        {profile.teamMember?.is_visible ? <Eye aria-hidden="true" className="size-3" /> : <EyeOff aria-hidden="true" className="size-3" />}
                        {profile.teamMember?.is_visible ? 'Visible' : 'Hidden'}
                      </span>
                      {profile.teamMember?.jobTitleName ? <p className="mt-1 text-[10px] text-[#7B8491]">{profile.teamMember.jobTitleName}</p> : null}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${profile.is_active ? 'text-[#14864B]' : 'text-[#7B8491]'}`}>
                        <span aria-hidden="true" className={`size-2 rounded-full ${profile.is_active ? 'bg-[#22C55E]' : 'bg-[#AAB1BB]'}`} />
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#586273]">{formatDate(profile.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openTeamEditor(profile)}
                          disabled={loading}
                          aria-label={`Edit public team profile for ${displayName(profile)}`}
                          title="Edit public team profile"
                          className="inline-flex size-8 items-center justify-center rounded-md text-[#8C1010] transition hover:bg-[#FFF0F0] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <BadgeCheck aria-hidden="true" className="size-4" strokeWidth={1.7} />
                        </button>
                        {canManageUsers ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openRoleEditor(profile)}
                              disabled={loading || isSelf}
                              aria-label={`Edit role for ${displayName(profile)}`}
                              title={isSelf ? 'Your own role cannot be changed' : 'Edit role'}
                              className="inline-flex size-8 items-center justify-center rounded-md text-[#667181] transition hover:bg-[#F2F4F7] hover:text-[#202938] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <Pencil aria-hidden="true" className="size-4" strokeWidth={1.7} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmation({ type: profile.is_active ? 'deactivate' : 'activate', profile })}
                              disabled={loading || isSelf}
                              aria-label={`${profile.is_active ? 'Deactivate' : 'Activate'} ${displayName(profile)}`}
                              title={isSelf ? 'Your own access cannot be changed' : profile.is_active ? 'Deactivate user' : 'Activate user'}
                              className="inline-flex size-8 items-center justify-center rounded-md text-[#667181] transition hover:bg-[#FFF7E8] hover:text-[#9A6700] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              {profile.is_active ? <PowerOff aria-hidden="true" className="size-4" strokeWidth={1.7} /> : <Power aria-hidden="true" className="size-4" strokeWidth={1.7} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmation({ type: 'delete', profile })}
                              disabled={loading || isSelf}
                              aria-label={`Delete ${displayName(profile)}`}
                              title={isSelf ? 'Your own profile cannot be deleted' : 'Delete user'}
                              className="inline-flex size-8 items-center justify-center rounded-md text-[#8C1010] transition hover:bg-[#FFF0F0] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.7} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {profiles.length === 0 ? <div className="px-6 py-16 text-center text-sm text-[#7B8491]">No approved users found.</div> : null}
      </section>

      {canManageUsers ? (
        <AdminModal
          open={requestModalOpen}
          onClose={() => !isPending && setRequestModalOpen(false)}
          title="Access Requests"
          description="Review up to 10 pending requests. Select a role before approving access."
          size="xl"
        >
          <form onSubmit={searchRequests} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="request-search" className="sr-only">
              Search access requests
            </label>
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8B94A1]" />
              <input
                id="request-search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                maxLength={160}
                placeholder="Search name or email..."
                className="h-10 w-full rounded-lg border border-[#D9DDE3] bg-[#F8F9FA] pr-3 pl-9 text-xs text-[#202938] transition outline-none focus:border-[#9F1010] focus:bg-white focus:ring-2 focus:ring-[#9F1010]/10"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#9F1010] px-6 text-xs font-semibold text-white transition hover:bg-[#7E0C0C] disabled:cursor-wait disabled:opacity-60"
            >
              Search
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-[#D9DDE3]">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="bg-[#F8F9FA] text-[10px] font-semibold tracking-[0.04em] text-[#737B87] uppercase">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E9ED]">
                {requests.map((request) => {
                  const loading = pendingId === request.user_id;
                  const name = request.full_name?.trim() || request.email;
                  const selectedRole = roles[request.user_id] ?? '';
                  return (
                    <tr key={request.user_id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={request.avatar_url ?? undefined} alt={name} sx={{ width: 34, height: 34, fontSize: 12, bgcolor: '#A6192E' }}>
                            {name.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#202938]">{name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[#707988]">{request.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#586273]">{formatRequestDate(request.requested_at)} WITA</td>
                      <td className="px-4 py-3">
                        <select
                          value={selectedRole}
                          onChange={(event) => setRoles((current) => ({ ...current, [request.user_id]: event.target.value as UserRole | '' }))}
                          disabled={loading}
                          aria-label={`Role for ${request.email}`}
                          className="h-9 min-w-36 rounded-lg border border-[#D9DDE3] bg-white px-3 text-xs text-[#202938] outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10"
                        >
                          <option value="">Select role</option>
                          {ASSIGNABLE_ADMIN_ROLES.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                              setRejecting(request);
                              setRequestModalOpen(false);
                            }}
                            className="h-8 rounded-md border border-[#D9DDE3] bg-white px-3 text-[11px] font-semibold text-[#586273] transition hover:bg-[#F8F9FA] disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={loading || !selectedRole}
                            onClick={() => approve(request)}
                            className="h-8 rounded-md bg-[#9F1010] px-3 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]"
                          >
                            Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {requests.length === 0 ? <div className="px-5 py-12 text-center text-sm text-[#7B8491]">No pending access requests found.</div> : null}
          </div>
          {requests.length === 10 ? <p className="mt-3 text-right text-[11px] text-[#7B8491]">Showing the first 10 matching requests.</p> : null}
        </AdminModal>
      ) : null}

      {canManageUsers ? (
        <AdminModal
          open={Boolean(editing)}
          onClose={() => !isPending && setEditing(null)}
          title="Edit User Role"
          description={editing ? `Update the dashboard role for ${displayName(editing)}.` : undefined}
          size="sm"
          footer={
            <>
              <button type="button" disabled={isPending} onClick={() => setEditing(null)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || editingRole === editing?.role}
                onClick={saveRole}
                className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]"
              >
                Save Role
              </button>
            </>
          }
        >
          <label htmlFor="profile-role" className="text-xs font-semibold text-[#303846]">
            Role
          </label>
          <select
            id="profile-role"
            value={editingRole}
            onChange={(event) => setEditingRole(event.target.value as UserRole)}
            className="mt-2 h-10 w-full rounded-lg border border-[#D9DDE3] bg-white px-3 text-xs text-[#202938] outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10"
          >
            {ASSIGNABLE_ADMIN_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </AdminModal>
      ) : null}

      {canManageUsers ? (
        <AdminModal
          open={Boolean(rejecting)}
          onClose={() => !isPending && cancelRejection()}
          title="Reject Access Request"
          description={rejecting?.email}
          size="sm"
          footer={
            <>
              <button type="button" disabled={isPending} onClick={cancelRejection} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
                Cancel
              </button>
              <button type="button" disabled={isPending} onClick={reject} className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:opacity-60">
                Reject Request
              </button>
            </>
          }
        >
          <label htmlFor="rejection-reason" className="text-xs font-semibold text-[#303846]">
            Reason <span className="font-normal text-[#7B8491]">(optional)</span>
          </label>
          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            maxLength={1000}
            rows={4}
            className="mt-2 w-full resize-none rounded-lg border border-[#D9DDE3] p-3 text-xs text-[#202938] outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10"
          />
          <p className="mt-1 text-right text-[10px] text-[#8B94A1]">{rejectionReason.length}/1000</p>
        </AdminModal>
      ) : null}

      {canManageUsers ? (
        <AdminModal
          open={Boolean(confirmation)}
          onClose={() => !isPending && setConfirmation(null)}
          title={confirmation?.type === 'delete' ? 'Delete User' : confirmation?.type === 'activate' ? 'Activate User' : 'Deactivate User'}
          description={confirmation ? `${displayName(confirmation.profile)} (${confirmation.profile.email})` : undefined}
          size="sm"
          footer={
            <>
              <button type="button" disabled={isPending} onClick={() => setConfirmation(null)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={applyConfirmation}
                className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:opacity-60"
              >
                Confirm
              </button>
            </>
          }
        >
          <p className="text-sm leading-6 text-[#586273]">
            {confirmation?.type === 'delete'
              ? 'The user will disappear from the main table, but their profile and operational history will be retained as soft-deleted data.'
              : confirmation?.type === 'activate'
                ? 'This user will regain access to the admin dashboard.'
                : 'This user will remain visible in the table but will no longer be able to access the admin dashboard.'}
          </p>
        </AdminModal>
      ) : null}

      <AdminModal
        open={Boolean(teamEditing)}
        onClose={() => !isPending && setTeamEditing(null)}
        title="Public Team Profile"
        description={teamEditing ? `Complete the About-page details for ${displayName(teamEditing)}.` : undefined}
        size="md"
        footer={
          <>
            <button type="button" disabled={isPending} onClick={() => setTeamEditing(null)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || !teamFullName.trim() || (teamIsVisible && !teamJobTitleId)}
              onClick={saveTeamProfile}
              className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]"
            >
              {isPending ? 'Saving...' : 'Save Profile'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="team-full-name" className="text-xs font-semibold text-[#303846]">
              Public Name <span className="text-[#C32929]">*</span>
            </label>
            <input
              id="team-full-name"
              value={teamFullName}
              onChange={(event) => setTeamFullName(event.target.value)}
              maxLength={160}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#D9DDE3] px-3 text-sm outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10"
            />
          </div>
          <div>
            <label htmlFor="team-job-title" className="text-xs font-semibold text-[#303846]">
              Job Title {teamIsVisible ? <span className="text-[#C32929]">*</span> : null}
            </label>
            <select
              id="team-job-title"
              value={teamJobTitleId}
              onChange={(event) => setTeamJobTitleId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#D9DDE3] bg-white px-3 text-sm outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10"
            >
              <option value="">Select Job Title</option>
              {jobTitles
                .filter((title) => title.is_active || title.id === teamJobTitleId)
                .map((title) => (
                  <option key={title.id} value={title.id}>
                    {title.name}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-[10px] text-[#7B8491]">Job Titles and their public order are managed in Master Data.</p>
          </div>
          <div>
            <label htmlFor="team-avatar-url" className="text-xs font-semibold text-[#303846]">
              Public Photo URL
            </label>
            <input
              id="team-avatar-url"
              type="url"
              value={teamAvatarUrl}
              onChange={(event) => setTeamAvatarUrl(event.target.value)}
              maxLength={2048}
              placeholder="https://..."
              className="mt-1.5 h-10 w-full rounded-lg border border-[#D9DDE3] px-3 text-sm outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10"
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="team-short-bio" className="text-xs font-semibold text-[#303846]">
                Short Bio
              </label>
              <span className="text-[10px] text-[#8B94A1]">{teamShortBio.length}/1000</span>
            </div>
            <textarea
              id="team-short-bio"
              value={teamShortBio}
              onChange={(event) => setTeamShortBio(event.target.value)}
              maxLength={1000}
              rows={4}
              className="mt-1.5 w-full resize-none rounded-lg border border-[#D9DDE3] p-3 text-sm leading-5 outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E1E4E8] bg-[#FAFBFC] p-3.5">
            <input type="checkbox" checked={teamIsVisible} onChange={(event) => setTeamIsVisible(event.target.checked)} className="mt-0.5 size-4 accent-[#8C1010]" />
            <span>
              <span className="block text-xs font-semibold text-[#303846]">Show on About page</span>
              <span className="mt-1 block text-[10px] leading-4 text-[#7B8491]">When disabled, the profile remains saved but is hidden from the public website.</span>
            </span>
          </label>
        </div>
      </AdminModal>
    </main>
  );
}
