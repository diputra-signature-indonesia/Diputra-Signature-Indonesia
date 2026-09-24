'use client';

import {
  approveAccessRequestAction,
  rejectAccessRequestAction,
  searchPendingAccessRequestsAction,
  setProfileActiveAction,
  softDeleteProfileAction,
  updateProfileRoleAction,
} from '@/app/admin/access-requests/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { ManagedProfile, PendingAccessRequest } from '@/lib/supabase/queries/user-management';
import { ASSIGNABLE_ADMIN_ROLES, type UserRole } from '@/types/auth-role';
import { Avatar } from '@mui/material';
import { Pencil, Power, PowerOff, Search, Trash2, UserRoundCheck } from 'lucide-react';
import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Notice = { tone: 'success' | 'error'; message: string };
type Confirmation = { type: 'activate' | 'deactivate' | 'delete'; profile: ManagedProfile };

type UserManagementWorkspaceProps = {
  currentUserId: string;
  profiles: ManagedProfile[];
  initialRequests: PendingAccessRequest[];
  initialPendingRequestCount: number;
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

export function UserManagementWorkspace({ currentUserId, profiles, initialRequests, initialPendingRequestCount }: UserManagementWorkspaceProps) {
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
      const result =
        type === 'delete'
          ? await softDeleteProfileAction(profile.id)
          : await setProfileActiveAction(profile.id, type === 'activate');
      finishMutation(result, () => setConfirmation(null));
    });
  };

  const openRoleEditor = (profile: ManagedProfile) => {
    setEditing(profile);
    setEditingRole(profile.role);
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
          <button
            type="button"
            onClick={() => setRequestModalOpen(true)}
            aria-label={`Open access requests${requestCount ? `, ${requestCount} pending` : ''}`}
            title="Access requests"
            className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#E1BEBE] bg-white text-[#8C1010] transition hover:border-[#C98E8E] hover:bg-[#FFF7F7] focus-visible:ring-2 focus-visible:ring-[#8C1010]/25 focus-visible:outline-none"
          >
            <UserRoundCheck aria-hidden="true" className="size-5" strokeWidth={1.8} />
            {requestCount > 0 ? (
              <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#D92D20] px-1 text-[10px] font-semibold leading-4 text-white">
                {requestCount > 99 ? '99+' : requestCount}
              </span>
            ) : null}
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="bg-[#F8F9FA] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#737B87]">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-5 py-4">Role</th>
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

      <AdminModal
        open={requestModalOpen}
        onClose={() => !isPending && setRequestModalOpen(false)}
        title="Access Requests"
        description="Review up to 10 pending requests. Select a role before approving access."
        size="xl"
      >
        <form onSubmit={searchRequests} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="request-search" className="sr-only">Search access requests</label>
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B94A1]" />
            <input
              id="request-search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              maxLength={160}
              placeholder="Search name or email..."
              className="h-10 w-full rounded-lg border border-[#D9DDE3] bg-[#F8F9FA] pl-9 pr-3 text-xs text-[#202938] outline-none transition focus:border-[#9F1010] focus:bg-white focus:ring-2 focus:ring-[#9F1010]/10"
            />
          </div>
          <button type="submit" disabled={isPending} className="inline-flex h-10 items-center justify-center rounded-lg bg-[#9F1010] px-6 text-xs font-semibold text-white transition hover:bg-[#7E0C0C] disabled:cursor-wait disabled:opacity-60">
            Search
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-[#D9DDE3]">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead className="bg-[#F8F9FA] text-[10px] font-semibold uppercase tracking-[0.04em] text-[#737B87]">
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
                        <Avatar src={request.avatar_url ?? undefined} alt={name} sx={{ width: 34, height: 34, fontSize: 12, bgcolor: '#A6192E' }}>{name.slice(0, 1).toUpperCase()}</Avatar>
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
                        {ASSIGNABLE_ADMIN_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
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
                        <button type="button" disabled={loading || !selectedRole} onClick={() => approve(request)} className="h-8 rounded-md bg-[#9F1010] px-3 text-[11px] font-semibold text-white transition hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]">Approve</button>
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

      <AdminModal
        open={Boolean(editing)}
        onClose={() => !isPending && setEditing(null)}
        title="Edit User Role"
        description={editing ? `Update the dashboard role for ${displayName(editing)}.` : undefined}
        size="sm"
        footer={(
          <>
            <button type="button" disabled={isPending} onClick={() => setEditing(null)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">Cancel</button>
            <button type="button" disabled={isPending || editingRole === editing?.role} onClick={saveRole} className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]">Save Role</button>
          </>
        )}
      >
        <label htmlFor="profile-role" className="text-xs font-semibold text-[#303846]">Role</label>
        <select id="profile-role" value={editingRole} onChange={(event) => setEditingRole(event.target.value as UserRole)} className="mt-2 h-10 w-full rounded-lg border border-[#D9DDE3] bg-white px-3 text-xs text-[#202938] outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10">
          {ASSIGNABLE_ADMIN_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
        </select>
      </AdminModal>

      <AdminModal
        open={Boolean(rejecting)}
        onClose={() => !isPending && cancelRejection()}
        title="Reject Access Request"
        description={rejecting?.email}
        size="sm"
        footer={(
          <>
            <button type="button" disabled={isPending} onClick={cancelRejection} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">Cancel</button>
            <button type="button" disabled={isPending} onClick={reject} className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:opacity-60">Reject Request</button>
          </>
        )}
      >
        <label htmlFor="rejection-reason" className="text-xs font-semibold text-[#303846]">Reason <span className="font-normal text-[#7B8491]">(optional)</span></label>
        <textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={1000} rows={4} className="mt-2 w-full resize-none rounded-lg border border-[#D9DDE3] p-3 text-xs text-[#202938] outline-none focus:border-[#9F1010] focus:ring-2 focus:ring-[#9F1010]/10" />
        <p className="mt-1 text-right text-[10px] text-[#8B94A1]">{rejectionReason.length}/1000</p>
      </AdminModal>

      <AdminModal
        open={Boolean(confirmation)}
        onClose={() => !isPending && setConfirmation(null)}
        title={confirmation?.type === 'delete' ? 'Delete User' : confirmation?.type === 'activate' ? 'Activate User' : 'Deactivate User'}
        description={confirmation ? `${displayName(confirmation.profile)} (${confirmation.profile.email})` : undefined}
        size="sm"
        footer={(
          <>
            <button type="button" disabled={isPending} onClick={() => setConfirmation(null)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">Cancel</button>
            <button type="button" disabled={isPending} onClick={applyConfirmation} className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:opacity-60">Confirm</button>
          </>
        )}
      >
        <p className="text-sm leading-6 text-[#586273]">
          {confirmation?.type === 'delete'
            ? 'The user will disappear from the main table, but their profile and operational history will be retained as soft-deleted data.'
            : confirmation?.type === 'activate'
              ? 'This user will regain access to the admin dashboard.'
              : 'This user will remain visible in the table but will no longer be able to access the admin dashboard.'}
        </p>
      </AdminModal>
    </main>
  );
}
