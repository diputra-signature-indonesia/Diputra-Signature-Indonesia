'use client';

import { approveAccessRequestAction, rejectAccessRequestAction } from '@/app/admin/access-requests/actions';
import { BrandButton } from '@/components/ui/button';
import { ASSIGNABLE_ADMIN_ROLES, type UserRole } from '@/types/auth-role';
import type { Tables } from '@/types/database.generated';
import { Avatar, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AccessRequest = Pick<Tables<'admin_access_requests'>, 'user_id' | 'email' | 'full_name' | 'avatar_url' | 'requested_at'>;

function formatRequestedAt(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Makassar',
  }).format(new Date(value));
}

export function AdminAccessRequestsClient({ requests }: { requests: AccessRequest[] }) {
  const router = useRouter();
  const [roles, setRoles] = useState<Record<string, UserRole>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedRole = (userId: string) => roles[userId] ?? 'staff';

  async function approve(request: AccessRequest) {
    if (!window.confirm(`Setujui ${request.email} sebagai ${selectedRole(request.user_id)}?`)) return;

    setLoadingId(request.user_id);
    setNotice(null);
    const result = await approveAccessRequestAction(request.user_id, selectedRole(request.user_id));
    setLoadingId(null);
    setNotice({ type: result.ok ? 'success' : 'error', message: result.message });
    if (result.ok) router.refresh();
  }

  async function reject() {
    if (!rejecting) return;

    setLoadingId(rejecting.user_id);
    setNotice(null);
    const result = await rejectAccessRequestAction(rejecting.user_id, rejectionReason);
    setLoadingId(null);
    setNotice({ type: result.ok ? 'success' : 'error', message: result.message });

    if (result.ok) {
      setRejecting(null);
      setRejectionReason('');
      router.refresh();
    }
  }

  return (
    <>
      {notice ? (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`} role="status">
          {notice.message}
        </div>
      ) : null}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-800">Tidak ada request pending</h2>
          <p className="mt-2 text-sm text-neutral-500">Permintaan akses baru akan muncul di halaman ini.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-5 py-4 font-semibold">Pengguna</th>
                <th className="px-5 py-4 font-semibold">Email</th>
                <th className="px-5 py-4 font-semibold">Waktu request</th>
                <th className="px-5 py-4 font-semibold">Role</th>
                <th className="px-5 py-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const loading = loadingId === request.user_id;
                return (
                  <tr key={request.user_id} className="border-t border-gray-100 align-middle">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={request.avatar_url ?? undefined} alt={request.full_name ?? request.email} sx={{ width: 40, height: 40 }} />
                        <span className="font-medium text-neutral-900">{request.full_name || 'Tanpa nama'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-neutral-600">{request.email}</td>
                    <td className="px-5 py-4 text-neutral-600">{formatRequestedAt(request.requested_at)} WITA</td>
                    <td className="px-5 py-4">
                      <select
                        value={selectedRole(request.user_id)}
                        onChange={(event) => setRoles((current) => ({ ...current, [request.user_id]: event.target.value as UserRole }))}
                        disabled={loading}
                        aria-label={`Role untuk ${request.email}`}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-maroon focus:outline-none"
                      >
                        {ASSIGNABLE_ADMIN_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <BrandButton variant="white" disabled={loading} onClick={() => setRejecting(request)}>
                          Tolak
                        </BrandButton>
                        <BrandButton variant="red" loading={loading} onClick={() => approve(request)}>
                          Setujui
                        </BrandButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(rejecting)} onClose={() => !loadingId && setRejecting(null)} fullWidth maxWidth="sm">
        <DialogTitle>Tolak permintaan akses</DialogTitle>
        <DialogContent>
          <p className="mb-4 text-sm text-neutral-600">{rejecting?.email}</p>
          <label htmlFor="rejection-reason" className="text-sm font-medium text-neutral-800">
            Alasan (opsional)
          </label>
          <textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            maxLength={1000}
            rows={4}
            className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm focus:border-brand-maroon focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-neutral-500">{rejectionReason.length}/1000</p>
        </DialogContent>
        <DialogActions sx={{ padding: '0 24px 24px' }}>
          <BrandButton variant="white" disabled={Boolean(loadingId)} onClick={() => setRejecting(null)}>
            Batal
          </BrandButton>
          <BrandButton variant="red" loading={Boolean(loadingId)} onClick={reject}>
            Tolak request
          </BrandButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
