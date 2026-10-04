'use client';

import { archiveMasterDataAction, saveMasterDataAction } from '@/app/admin/master-data/actions';
import { AdminPendingOverlay } from '@/components/layout-admin/admin-route-loading';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { MasterDataCategory, MasterDataCategoryId, MasterDataRow } from '@/data/admin-master-data/master-data';
import { Archive, ArrowLeft, LoaderCircle, Plus, Search, Shapes } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MasterDataCategoryList } from './master-data-category-list';
import { MasterDataFormModal, type MasterDataFormCategoryId, type MasterDataFormValues } from './master-data-form-modal';
import { MasterDataTable } from './master-data-table';
import { MasterDataPagination } from './master-data-pagination';
import { useInternalServiceSearch } from './use-internal-service-search';

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
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0);
  const [removeModal, setRemoveModal] = useState<{ categoryId: 'internal-services' | 'internal-service-categories'; row: MasterDataRow } | null>(null);

  const selectedCategory = initialCategories.find((category) => category.id === selectedId) ?? initialCategories[0];
  const workflowTemplates = initialCategories.find((category) => category.id === 'workflow-templates')?.rows ?? [];
  const internalCategories = initialCategories.find((category) => category.id === 'internal-service-categories')?.rows ?? [];
  const isInternalServices = selectedCategory.id === 'internal-services';
  const serviceSearch = useInternalServiceSearch({ search, categoryId: categoryFilter, page }, isInternalServices, serviceRefreshKey);
  const servicePage = serviceSearch.data;
  const serviceBusy = serviceSearch.isLoading || Boolean(serviceSearch.error);
  const displayedCategory = isInternalServices
    ? { ...selectedCategory, rows: servicePage?.rows ?? [] }
    : selectedCategory.id === 'workflow-templates'
      ? { ...selectedCategory, rows: selectedCategory.rows.filter((row) => row.isActive !== showWorkflowTrash) }
      : selectedCategory;
  const removeIsPermanent = removeModal?.categoryId === 'internal-service-categories' || removeModal?.row.referenceCount === 0;

  const selectCategory = (categoryId: MasterDataCategoryId) => {
    setSelectedId(categoryId);
    setShowWorkflowTrash(false);
    setPage(1);
    if (categoryId === 'internal-services') setServiceRefreshKey((current) => current + 1);
    setNotice(null);
  };

  const openAddModal = () => {
    if (!canManage) return;
    setNotice(null);
    setModal({ mode: 'add', categoryId: selectedCategory.id });
  };

  const openEditModal = (row: MasterDataRow) => {
    if (!canManage) return;
    if (selectedCategory.id === 'internal-service-categories' && (row.referenceCount ?? 0) > 0) return;
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
        setServiceRefreshKey((current) => current + 1);
        router.refresh();
      }
    });
  };

  const removeRow = (row: MasterDataRow, categoryId: MasterDataCategoryId) => {
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
      if (result.ok) {
        setRemoveModal(null);
        setServiceRefreshKey((current) => current + 1);
        router.refresh();
      }
    });
  };

  const archiveRow = (row: MasterDataRow) => {
    const categoryId = selectedCategory.id;
    if (!canManage) return;
    if (categoryId === 'internal-services' || categoryId === 'internal-service-categories') {
      if (categoryId === 'internal-service-categories' && (row.referenceCount ?? 0) > 0) return;
      setNotice(null);
      setRemoveModal({ categoryId, row });
      return;
    }
    if (window.confirm(`Deactivate ${rowLabel(row)}? Existing historical references will be preserved.`)) removeRow(row, categoryId);
  };

  return (
    <main className="p-4 pb-20 sm:p-5 lg:p-6" aria-busy={isPending}>
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
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {isInternalServices || selectedCategory.id === 'internal-service-categories' ? (
                <button
                  type="button"
                  onClick={() => selectCategory(isInternalServices ? 'internal-service-categories' : 'internal-services')}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D9DDE3] bg-white px-3.5 text-xs font-semibold text-[#586273] transition hover:bg-[#FAFBFC] focus-visible:ring-2 focus-visible:ring-[#8C1010]/25 focus-visible:outline-none"
                >
                  {isInternalServices ? <Shapes aria-hidden="true" className="size-4" /> : <ArrowLeft aria-hidden="true" className="size-4" />}
                  {isInternalServices ? 'Manage Categories' : 'View Services'}
                </button>
              ) : null}
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
            {isInternalServices ? (
              <div className="mb-5 grid gap-3 rounded-xl border border-[#E4E7EB] bg-[#FAFBFC] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_auto] sm:items-end">
                <div>
                  <label htmlFor="internal-service-search" className="mb-1.5 block text-xs font-semibold text-[#303846]">
                    Search Services
                  </label>
                  <div className="relative">
                    <Search aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-4 text-[#8A94A3]" />
                    <input
                      id="internal-service-search"
                      type="search"
                      maxLength={160}
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Service name, code, or category..."
                      className="h-10 w-full rounded-lg border border-[#D6DAE0] bg-white pr-3 pl-9 text-sm text-[#303846] outline-none placeholder:text-[#A0A8B4] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="internal-service-category-filter" className="mb-1.5 block text-xs font-semibold text-[#303846]">
                    Category
                  </label>
                  <select
                    id="internal-service-category-filter"
                    value={categoryFilter}
                    onChange={(event) => {
                      setCategoryFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
                  >
                    <option value="">All Categories</option>
                    <option value="uncategorized">Uncategorized</option>
                    {internalCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {rowLabel(category)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('');
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-[#D6DAE0] bg-white px-4 text-xs font-semibold text-[#586273] transition hover:bg-[#F1F3F5] focus-visible:ring-2 focus-visible:ring-[#8C1010]/25 focus-visible:outline-none"
                >
                  Reset
                </button>
              </div>
            ) : null}
            {selectedCategory.id === 'internal-service-categories' ? (
              <p className="mb-4 rounded-lg border border-[#D9DDE3] bg-[#F7F8FA] px-4 py-3 text-xs leading-5 text-[#667181]">
                Categories are internal only, unrelated to Client Services. Edit and delete are locked whenever any service uses the category, including inactive services.
              </p>
            ) : null}
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
            {isInternalServices && serviceSearch.isLoading ? (
              <p role="status" className="mb-3 flex items-center gap-2 text-xs text-[#707988]">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Searching services...
              </p>
            ) : null}
            {isInternalServices && serviceSearch.error ? (
              <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[#F3B9B9] bg-[#FFF0F0] px-4 py-3 text-xs text-[#A51919]">
                <p>{serviceSearch.error}</p>
                <button type="button" onClick={() => setServiceRefreshKey((current) => current + 1)} className="shrink-0 font-semibold underline">
                  Retry
                </button>
              </div>
            ) : null}
            <div aria-busy={isInternalServices && serviceSearch.isLoading} className={isInternalServices && serviceBusy ? 'opacity-50' : undefined}>
              <MasterDataTable
                category={displayedCategory}
                emptyMessage={
                  isInternalServices
                    ? serviceSearch.isLoading
                      ? 'Loading services...'
                      : serviceSearch.error
                        ? 'Services could not be loaded. Please retry.'
                        : 'No services match the search and category.'
                    : undefined
                }
                canManage={canManage && !isPending && (!isInternalServices || !serviceBusy)}
                pendingRowId={pendingRowId}
                onEdit={openEditModal}
                onArchive={archiveRow}
              />
            </div>
            {isInternalServices && servicePage ? <MasterDataPagination {...servicePage} disabled={serviceBusy || isPending} onChange={setPage} /> : null}
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
          internalCategories={internalCategories}
          defaultInternalCategoryId={internalCategories.some((category) => category.id === categoryFilter) ? categoryFilter : ''}
          errorMessage={notice?.tone === 'error' ? notice.message : undefined}
          isSaving={isPending}
          onClose={() => setModal(null)}
          onSave={saveForm}
        />
      ) : null}
      {removeModal ? (
        <AdminModal
          open
          size="sm"
          onClose={isPending ? () => undefined : () => setRemoveModal(null)}
          title={removeIsPermanent ? 'Delete permanently?' : 'Deactivate service?'}
          description={rowLabel(removeModal.row)}
          footer={
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setRemoveModal(null)}
                className="h-9 rounded-lg px-4 text-xs font-semibold text-[#4F5968] hover:bg-[#ECEFF2] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => removeRow(removeModal.row, removeModal.categoryId)}
                className="h-9 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:opacity-50"
              >
                {isPending ? 'Updating...' : removeIsPermanent ? 'Delete permanently' : 'Deactivate'}
              </button>
            </>
          }
        >
          {notice?.tone === 'error' ? (
            <p role="alert" className="mb-3 text-xs text-[#A51919]">
              {notice.message}
            </p>
          ) : null}
          <p className="text-sm leading-6 text-[#586273]">
            {removeIsPermanent
              ? 'This record is unused and will be permanently deleted. This cannot be undone.'
              : 'This service is referenced by Jobs or SOPs. It will be deactivated instead of deleted, preserving all historical references.'}
          </p>
          <p className="mt-3 text-xs leading-5 text-[#8A94A3]">
            Usage is checked again before saving. If a service has become used, it will be deactivated; a category that has become used cannot be deleted.
          </p>
        </AdminModal>
      ) : null}
      {isPending ? <AdminPendingOverlay label={pendingRowId ? 'Updating Master Data...' : 'Saving Master Data...'} /> : null}
    </main>
  );
}
