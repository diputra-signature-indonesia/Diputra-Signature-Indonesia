'use client';

import { archiveMasterDataAction, saveMasterDataAction } from '@/app/admin/master-data/actions';
import type { MasterDataCategory, MasterDataCategoryId, MasterDataRow } from '@/data/admin-master-data/master-data';
import { Archive, ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MasterDataCategoryList } from './master-data-category-list';
import { MasterDataFormModal, type MasterDataFormCategoryId, type MasterDataFormValues } from './master-data-form-modal';
import { MasterDataTable } from './master-data-table';

type FormModalState = {
  mode: 'add' | 'edit';
  categoryId: MasterDataFormCategoryId;
  row?: MasterDataRow;
};

type Notice = { tone: 'success' | 'error'; message: string };

type MasterDataWorkspaceProps = {
  initialCategories: MasterDataCategory[];
  canManage: boolean;
};

function isFormCategory(categoryId: MasterDataCategoryId): categoryId is MasterDataFormCategoryId {
  return ['priorities', 'internal-services', 'task-statuses', 'job-statuses', 'workflow-templates'].includes(categoryId);
}

function rowLabel(row: MasterDataRow) {
  const firstCell = row.cells[0];
  return firstCell?.type === 'text' ? firstCell.value : 'this data';
}

export function MasterDataWorkspace({ initialCategories, canManage }: MasterDataWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<MasterDataCategoryId>('priorities');
  const [showWorkflowTrash, setShowWorkflowTrash] = useState(false);
  const [modal, setModal] = useState<FormModalState | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const selectedCategory = initialCategories.find((category) => category.id === selectedId) ?? initialCategories[0];
  const workflowTemplates = initialCategories.find((category) => category.id === 'workflow-templates')?.rows ?? [];
  const displayedCategory = selectedCategory.id === 'workflow-templates' ? { ...selectedCategory, rows: selectedCategory.rows.filter((row) => row.isActive !== showWorkflowTrash) } : selectedCategory;

  const selectCategory = (categoryId: MasterDataCategoryId) => {
    setSelectedId(categoryId);
    setShowWorkflowTrash(false);
    setNotice(null);
  };

  const openAddModal = () => {
    if (!canManage || !isFormCategory(selectedCategory.id)) return;
    setNotice(null);
    setModal({ mode: 'add', categoryId: selectedCategory.id });
  };

  const openEditModal = (row: MasterDataRow) => {
    if (!canManage || !isFormCategory(selectedCategory.id)) return;
    setNotice(null);
    setModal({ mode: 'edit', categoryId: selectedCategory.id, row });
  };

  const saveForm = (values: MasterDataFormValues) => {
    if (!modal) return;

    startTransition(async () => {
      const result = await saveMasterDataAction({
        categoryId: modal.categoryId,
        id: modal.row?.id,
        expectedVersion: modal.row?.version,
        values,
      });

      setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
      if (result.ok) {
        setModal(null);
        router.refresh();
      }
    });
  };

  const archiveRow = (row: MasterDataRow) => {
    const categoryId = selectedCategory.id;
    if (!canManage || categoryId === 'service-categories') return;
    if (!window.confirm(`Deactivate ${rowLabel(row)}? Existing historical references will be preserved.`)) return;

    setPendingRowId(row.id);
    setNotice(null);
    startTransition(async () => {
      const result = await archiveMasterDataAction({
        categoryId,
        id: row.id,
        expectedVersion: row.version,
      });
      setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
      setPendingRowId(null);
      if (result.ok) router.refresh();
    });
  };

  return (
    <main className="p-4 pb-20 sm:p-5 lg:p-6">
      <section className="grid min-h-[650px] overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <MasterDataCategoryList categories={initialCategories} selectedId={selectedCategory.id} onSelect={selectCategory} />

        <div className="min-w-0 bg-white">
          <header className="flex flex-col gap-4 border-b border-[#E4E7EB] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-[#202938]">
                {selectedCategory.label}
                {showWorkflowTrash ? ' — Trash' : ''}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#707988]">{selectedCategory.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedCategory.id === 'workflow-templates' ? (
                <button
                  type="button"
                  onClick={() => setShowWorkflowTrash((current) => !current)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D9DDE3] bg-white px-3.5 text-xs font-semibold text-[#586273] transition hover:border-[#C4C9D0] hover:bg-[#FAFBFC] focus-visible:ring-2 focus-visible:ring-[#8C1010]/25 focus-visible:outline-none"
                >
                  {showWorkflowTrash ? <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.7} /> : <Archive aria-hidden="true" className="size-4" strokeWidth={1.7} />}
                  {showWorkflowTrash ? 'Active Workflows' : 'Trash'}
                </button>
              ) : null}
              {selectedCategory.addLabel ? (
                <button
                  type="button"
                  onClick={openAddModal}
                  disabled={!canManage || isPending}
                  title={canManage ? undefined : 'Only admin and super admin can add Master Data'}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:ring-2 focus-visible:ring-[#8C1010]/35 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-[#B9BEC6]"
                >
                  <Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  {selectedCategory.addLabel}
                </button>
              ) : null}
            </div>
          </header>

          <div className="p-4 sm:p-6">
            {notice ? (
              <div
                role="status"
                className={`mb-4 rounded-lg border px-4 py-3 text-xs font-medium ${
                  notice.tone === 'success' ? 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]' : 'border-[#F3B9B9] bg-[#FFF0F0] text-[#A51919]'
                }`}
              >
                {notice.message}
              </div>
            ) : null}
            {!canManage ? (
              <div className="mb-4 rounded-lg border border-[#D9DDE3] bg-[#F7F8FA] px-4 py-3 text-xs text-[#667181]">You have read-only access. Only admin and super admin can change Master Data.</div>
            ) : null}
            <MasterDataTable
              category={displayedCategory}
              canManage={canManage}
              pendingRowId={pendingRowId}
              onEdit={isFormCategory(selectedCategory.id) ? openEditModal : undefined}
              onArchive={selectedCategory.id === 'service-categories' ? undefined : archiveRow}
            />
          </div>
        </div>
      </section>

      {modal ? (
        <MasterDataFormModal
          key={`${modal.mode}-${modal.categoryId}-${modal.row?.id ?? 'new'}`}
          open
          mode={modal.mode}
          categoryId={modal.categoryId}
          row={modal.row}
          workflowTemplates={workflowTemplates}
          isSaving={isPending}
          onClose={() => setModal(null)}
          onSave={saveForm}
        />
      ) : null}
    </main>
  );
}
