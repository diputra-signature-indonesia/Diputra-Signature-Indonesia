'use client';

import { updateOwnDisplayNameAction } from '@/app/admin/account-actions';
import { ASSIGNABLE_ADMIN_ROLES } from '@/types/auth-role';
import type { OwnAccountDetails } from '@/types/account-profile';
import { Avatar } from '@mui/material';
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { AdminModal } from './admin-modal';
import { useAdminPage } from './use-admin-page';

function ReadOnlyDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-[#68717E]">{label}</dt>
      <dd className="mt-1 text-sm leading-6 break-words text-[#303846]">{children}</dd>
    </div>
  );
}

export function AdminAccountModal({ onClose, onSaved, initialName = '' }: { onClose: () => void; onSaved: (name: string) => void; initialName?: string }) {
  const router = useRouter();
  const formId = useId();
  const [revision, setRevision] = useState(0);
  const result = useAdminPage<OwnAccountDetails>('/api/admin/account?revision=' + revision);
  const [draft, setDraft] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const data = result.data;
  const persistedName = savedName ?? data?.displayName ?? initialName;
  const displayName = draft ?? persistedName;
  const valid = Boolean(displayName.trim()) && displayName.trim().length <= 160 && !/[\u0000-\u001f\u007f]/.test(displayName);
  const canSave = Boolean(data && !result.loading && !result.error && !pending && valid && displayName.trim() !== persistedName);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const response = await updateOwnDisplayNameAction(displayName);
        if (!response.ok) {
          setNotice({ ok: false, message: response.message });
          return;
        }
        setDraft(response.displayName);
        setSavedName(response.displayName);
        onSaved(response.displayName);
        setNotice({ ok: true, message: 'Your display name has been updated. Your public profile is unchanged.' });
        router.refresh();
      } catch {
        setNotice({ ok: false, message: 'Unable to save your display name. Please try again.' });
      }
    });
  };
  const publicProfile = data?.publicProfile;
  return (
    <AdminModal
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      title="My Account"
      description="Your account details and public team profile."
      size="lg"
      footer={
        <>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="h-10 rounded-lg border border-[#D6DAE0] bg-white px-4 text-xs font-semibold text-[#596579] transition hover:bg-[#F5F6F8] disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="submit"
            form={formId}
            disabled={!canSave}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white transition hover:bg-[#860D0D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            {pending ? 'Saving...' : 'Save Display Name'}
          </button>
        </>
      }
    >
      {result.loading ? (
        <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-[#7B8491]">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Loading your account...
        </p>
      ) : result.error ? (
        <div role="alert" className="rounded-lg border border-[#FFC9C9] bg-[#FFF5F5] p-4 text-sm text-[#A51919]">
          <p>{result.error}</p>
          <button type="button" onClick={() => setRevision((n) => n + 1)} className="mt-3 rounded-lg border border-[#FFC9C9] px-3 py-2 text-xs font-semibold hover:bg-white">
            Try again
          </button>
        </div>
      ) : data ? (
        <form id={formId} onSubmit={submit} className="space-y-5">
          <dl className="grid gap-4 rounded-xl border border-[#E4E7EB] bg-[#FAFBFC] p-4 sm:grid-cols-2">
            <ReadOnlyDetail label="Role">{ASSIGNABLE_ADMIN_ROLES.find((role) => role.value === data.role)?.label ?? data.role}</ReadOnlyDetail>
            <ReadOnlyDetail label="Email">{data.email || 'Not provided'}</ReadOnlyDetail>
          </dl>
          <div>
            <label htmlFor={formId + '-display-name'} className="mb-1.5 block text-xs font-semibold text-[#303846]">
              Display Name <span className="text-[#C32929]">*</span>
            </label>
            <input
              id={formId + '-display-name'}
              name="displayName"
              type="text"
              autoComplete="nickname"
              required
              maxLength={160}
              value={displayName}
              disabled={pending}
              onChange={(event) => {
                setDraft(event.target.value);
                setNotice(null);
              }}
              aria-describedby={formId + '-name-help'}
              className="h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] transition outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10 disabled:bg-[#F2F3F5]"
            />
            <p id={formId + '-name-help'} className="mt-1.5 text-xs leading-5 text-[#7B8491]">
              Used for your name in the admin workspace. This does not change your public team name.
            </p>
          </div>
          <section className="overflow-hidden rounded-xl border border-[#D9DDE3]">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E7EB] bg-[#FAFBFC] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#303846]">Public Profile</h3>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7B8491]">
                <LockKeyhole aria-hidden="true" className="size-3.5" />
                Read only
              </span>
            </header>
            {publicProfile ? (
              <div className="space-y-4 p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={publicProfile.avatarUrl ?? undefined}
                    alt={publicProfile.fullName}
                    variant="rounded"
                    sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: '#F7EDEF', color: '#9F1010', fontSize: '18px' }}
                  >
                    {publicProfile.fullName.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <span
                    className={
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ' +
                      (publicProfile.isVisible ? 'border-[#A8EAC0] bg-[#EEFBF3] text-[#008F5B]' : 'border-[#D6DCE5] bg-[#F5F6F8] text-[#68717E]')
                    }
                  >
                    {publicProfile.isVisible ? <Eye aria-hidden="true" className="size-3.5" /> : <EyeOff aria-hidden="true" className="size-3.5" />}
                    {publicProfile.isVisible ? 'Visible on About page' : 'Hidden from About page'}
                  </span>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <ReadOnlyDetail label="Public Name">{publicProfile.fullName}</ReadOnlyDetail>
                  <ReadOnlyDetail label="Job Title">{publicProfile.jobTitle || 'Not assigned'}</ReadOnlyDetail>
                  {publicProfile.nickname ? <ReadOnlyDetail label="Nickname">{publicProfile.nickname}</ReadOnlyDetail> : null}
                  <div className="sm:col-span-2">
                    <ReadOnlyDetail label="Bio">{publicProfile.shortBio || 'No bio added yet.'}</ReadOnlyDetail>
                  </div>
                </dl>
                <p className="text-xs leading-5 text-[#7B8491]">Public profile details are managed by an administrator in User Management.</p>
              </div>
            ) : (
              <p className="p-4 text-sm text-[#7B8491]">No public team profile has been created for this account yet.</p>
            )}
          </section>
          {notice ? (
            <p
              role={notice.ok ? 'status' : 'alert'}
              className={'rounded-lg border px-3 py-2.5 text-xs leading-5 ' + (notice.ok ? 'border-[#A8EAC0] bg-[#EEFBF3] text-[#008F5B]' : 'border-[#FFC9C9] bg-[#FFF5F5] text-[#A51919]')}
            >
              {notice.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </AdminModal>
  );
}
