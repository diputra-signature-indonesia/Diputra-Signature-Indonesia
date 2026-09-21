'use client';

import {
  masterDataCategories,
  type MasterDataCategory,
  type MasterDataCategoryId,
  type MasterDataRow,
} from '@/data/admin-master-data/master-data-dummy-data';
import { Archive, Plus } from 'lucide-react';
import { useState } from 'react';
import { MasterDataCategoryList } from './master-data-category-list';
import {
  MasterDataFormModal,
  type MasterDataFormCategoryId,
  type MasterDataFormValues,
} from './master-data-form-modal';
import { MasterDataTable } from './master-data-table';

type FormModalState = {
  mode: 'add' | 'edit';
  categoryId: MasterDataFormCategoryId;
  row?: MasterDataRow;
};

function isFormCategory(categoryId: MasterDataCategoryId): categoryId is MasterDataFormCategoryId {
  return ['priorities', 'internal-services', 'task-statuses', 'job-statuses', 'workflow-templates'].includes(categoryId);
}

function canAddCategory(categoryId: MasterDataCategoryId) {
  return categoryId === 'priorities' || categoryId === 'internal-services' || categoryId === 'task-statuses' || categoryId === 'workflow-templates';
}

function availabilityCell(isActive: boolean) {
  return isActive
    ? ({ type: 'badge', value: 'Active', tone: 'green' } as const)
    : ({ type: 'badge', value: 'Inactive', tone: 'gray' } as const);
}

function buildRow(categoryId: MasterDataFormCategoryId, values: MasterDataFormValues, workflowTemplates: MasterDataRow[], currentRow?: MasterDataRow): MasterDataRow {
  const id = currentRow?.id ?? `${categoryId}-${Date.now()}`;
  const isSystem = currentRow?.isSystem ?? false;

  if (categoryId === 'workflow-templates') {
    return {
      id,
      code: values.code,
      cells: [
        { type: 'text', value: values.name, secondary: values.summary || undefined },
        { type: 'steps', items: values.steps.map((step) => step.name) },
        currentRow?.cells[2] ?? { type: 'text', value: '0 services' },
        availabilityCell(values.isActive),
      ],
    };
  }

  if (categoryId === 'internal-services') {
    const workflow = workflowTemplates.find((row) => row.cells[0].type === 'text' && row.cells[0].value === values.workflow);
    const workflowSteps = workflow?.cells[1];
    const stepCount = workflowSteps?.type === 'steps' ? workflowSteps.items.length : 0;

    return {
      id,
      cells: [
        { type: 'text', value: values.name, secondary: values.summary || undefined },
        { type: 'text', value: values.code, mono: true },
        {
          type: 'text',
          value: values.workflow || 'Not assigned',
          secondary: values.workflow ? `${stepCount} ordered steps` : 'Required before use',
        },
        availabilityCell(values.isActive),
      ],
    };
  }

  const previousName = currentRow?.cells[0];
  const secondary = previousName?.type === 'text' ? previousName.secondary : undefined;

  if (categoryId === 'priorities') {
    return {
      id,
      isSystem,
      cells: [
        { type: 'text', value: values.name, secondary },
        { type: 'text', value: values.code, mono: true },
        { type: 'color', value: values.color, color: values.color },
        { type: 'text', value: String(values.sortOrder) },
        availabilityCell(isSystem ? true : values.isActive),
      ],
    };
  }

  return {
    id,
    isSystem,
    cells: [
      { type: 'text', value: values.name, secondary },
      { type: 'text', value: values.code, mono: true },
      { type: 'color', value: values.color, color: values.color },
      { type: 'text', value: String(values.sortOrder) },
      availabilityCell(isSystem ? true : values.isActive),
      { type: 'badge', value: isSystem ? 'System' : 'Custom', tone: isSystem ? 'gray' : 'purple' },
    ],
  };
}

export function MasterDataWorkspace() {
  const [selectedId, setSelectedId] = useState<MasterDataCategoryId>('priorities');
  const [categories, setCategories] = useState<MasterDataCategory[]>(() => masterDataCategories);
  const [modal, setModal] = useState<FormModalState | null>(null);
  const selectedCategory = categories.find((category) => category.id === selectedId) ?? categories[0];
  const workflowTemplates = categories.find((category) => category.id === 'workflow-templates')?.rows ?? [];

  const selectCategory = (categoryId: MasterDataCategoryId) => {
    setSelectedId(categoryId);
  };

  const openAddModal = () => {
    if (!isFormCategory(selectedCategory.id) || selectedCategory.id === 'job-statuses') return;
    setModal({ mode: 'add', categoryId: selectedCategory.id });
  };

  const openEditModal = (row: MasterDataRow) => {
    if (!isFormCategory(selectedCategory.id)) return;
    setModal({ mode: 'edit', categoryId: selectedCategory.id, row });
  };

  const saveForm = (values: MasterDataFormValues) => {
    if (!modal) return;
    const nextRow = buildRow(modal.categoryId, values, workflowTemplates, modal.row);

    setCategories((current) =>
      current.map((category) => {
        if (category.id !== modal.categoryId) return category;

        const rows = modal.mode === 'add'
          ? [...category.rows, nextRow]
          : category.rows.map((row) => (row.id === modal.row?.id ? nextRow : row));

        return { ...category, rows };
      })
    );
    setModal(null);
  };

  return (
    <main className="p-4 pb-20 sm:p-5 lg:p-6">
      <section className="grid min-h-[650px] overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <MasterDataCategoryList categories={categories} selectedId={selectedCategory.id} onSelect={selectCategory} />

        <div className="min-w-0 bg-white">
          <header className="flex flex-col gap-4 border-b border-[#E4E7EB] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-[#202938]">{selectedCategory.label}</h2>
              <p className="mt-1 text-xs leading-5 text-[#707988]">{selectedCategory.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedCategory.id === 'workflow-templates' ? (
                <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D9DDE3] bg-white px-3.5 text-xs font-semibold text-[#586273] transition hover:border-[#C4C9D0] hover:bg-[#FAFBFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/25">
                  <Archive aria-hidden="true" className="size-4" strokeWidth={1.7} />
                  Trash
                </button>
              ) : null}
              {selectedCategory.addLabel ? (
                <button
                  type="button"
                  onClick={openAddModal}
                  disabled={!canAddCategory(selectedCategory.id)}
                  title={canAddCategory(selectedCategory.id) ? undefined : 'Form will be added in a later phase'}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35 disabled:cursor-not-allowed disabled:bg-[#B9BEC6]"
                >
                  <Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  {selectedCategory.addLabel}
                </button>
              ) : null}
            </div>
          </header>

          <div className="p-4 sm:p-6">
            <MasterDataTable category={selectedCategory} onEdit={isFormCategory(selectedCategory.id) ? openEditModal : undefined} />
          </div>
        </div>
      </section>

      {modal ? (
        <MasterDataFormModal
          open
          mode={modal.mode}
          categoryId={modal.categoryId}
          row={modal.row}
          workflowTemplates={workflowTemplates}
          onClose={() => setModal(null)}
          onSave={saveForm}
        />
      ) : null}
    </main>
  );
}
