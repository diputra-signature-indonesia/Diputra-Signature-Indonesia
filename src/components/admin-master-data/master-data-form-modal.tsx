'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import { masterDataCategories, type MasterDataCategoryId, type MasterDataRow } from '@/data/admin-master-data/master-data-dummy-data';
import { useId, useState, type FormEvent } from 'react';

export type MasterDataFormCategoryId = Extract<MasterDataCategoryId, 'priorities' | 'internal-services' | 'task-statuses' | 'job-statuses'>;

export type MasterDataFormValues = {
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  summary: string;
  workflow: string;
};

type MasterDataFormModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  categoryId: MasterDataFormCategoryId;
  row?: MasterDataRow;
  onClose: () => void;
  onSave: (values: MasterDataFormValues) => void;
};

const fieldClassName =
  'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none transition placeholder:text-[#A0A8B4] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10 disabled:cursor-not-allowed disabled:bg-[#F1F3F5] disabled:text-[#8A94A3]';

const categoryLabels: Record<MasterDataFormCategoryId, string> = {
  priorities: 'Priority',
  'internal-services': 'Internal Service',
  'task-statuses': 'Task Status',
  'job-statuses': 'Job Status',
};

function textValue(row: MasterDataRow | undefined, index: number) {
  const cell = row?.cells[index];
  return cell?.type === 'text' || cell?.type === 'badge' || cell?.type === 'color' ? cell.value : '';
}

function secondaryValue(row: MasterDataRow | undefined, index: number) {
  const cell = row?.cells[index];
  return cell?.type === 'text' ? (cell.secondary ?? '') : '';
}

function colorValue(row: MasterDataRow | undefined, index: number) {
  const cell = row?.cells[index];
  return cell?.type === 'color' ? cell.color : '#8C1010';
}

function initialValues(categoryId: MasterDataFormCategoryId, row?: MasterDataRow): MasterDataFormValues {
  if (categoryId === 'internal-services') {
    const workflow = textValue(row, 2);
    return {
      code: textValue(row, 1),
      name: textValue(row, 0),
      color: '#8C1010',
      sortOrder: 0,
      isActive: textValue(row, 3) !== 'Inactive',
      summary: secondaryValue(row, 0),
      workflow: workflow === 'Not assigned' ? '' : workflow,
    };
  }

  return {
    code: textValue(row, 1),
    name: textValue(row, 0),
    color: colorValue(row, 2),
    sortOrder: Number(textValue(row, 3)) || 0,
    isActive: textValue(row, 4) !== 'Inactive',
    summary: '',
    workflow: '',
  };
}

function RequiredMark() {
  return <span className="text-[#C32929]">*</span>;
}

export function MasterDataFormModal({ open, mode, categoryId, row, onClose, onSave }: MasterDataFormModalProps) {
  const formId = useId();
  const [values, setValues] = useState(() => initialValues(categoryId, row));
  const label = categoryLabels[categoryId];
  const isSystemRecord = Boolean(row?.isSystem);
  const isInternalService = categoryId === 'internal-services';

  const updateValue = <Key extends keyof MasterDataFormValues>(key: Key, value: MasterDataFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleCodeChange = (value: string) => {
    updateValue('code', value.toUpperCase().replace(/[^A-Z0-9_]/g, ''));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ ...values, code: values.code.trim(), name: values.name.trim(), summary: values.summary.trim() });
  };

  const workflowTemplates = masterDataCategories.find((category) => category.id === 'workflow-templates')?.rows ?? [];

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={`${mode === 'add' ? 'Add' : 'Edit'} ${label}`}
      description={`${mode === 'add' ? 'Create a new' : 'Update the selected'} ${label.toLowerCase()} record.`}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#4F5968] transition hover:bg-[#ECEFF2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/25">
            Cancel
          </button>
          <button type="submit" form={formId} className="h-9 rounded-lg bg-[#8C1010] px-5 text-xs font-semibold text-white transition hover:bg-[#710C0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35">
            {mode === 'add' ? 'Save Data' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={`${formId}-code`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
            Code <RequiredMark />
          </label>
          <input
            id={`${formId}-code`}
            autoFocus={mode === 'add'}
            required
            minLength={2}
            maxLength={80}
            value={values.code}
            onChange={(event) => handleCodeChange(event.target.value)}
            disabled={mode === 'edit'}
            placeholder="EXAMPLE_CODE"
            className={fieldClassName}
          />
          {mode === 'edit' ? <p className="mt-1.5 text-[10px] leading-4 text-[#8A94A3]">Code is permanent and cannot be changed after creation.</p> : null}
        </div>

        <div>
          <label htmlFor={`${formId}-name`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
            {isInternalService ? 'Service Name' : 'Name'} <RequiredMark />
          </label>
          <input
            id={`${formId}-name`}
            autoFocus={mode === 'edit'}
            required
            maxLength={160}
            value={values.name}
            onChange={(event) => updateValue('name', event.target.value)}
            placeholder={isInternalService ? 'Enter service name' : `Enter ${label.toLowerCase()} name`}
            className={fieldClassName}
          />
        </div>

        {isInternalService ? (
          <>
            <div>
              <label htmlFor={`${formId}-workflow`} className="mb-1.5 block text-xs font-semibold text-[#303846]">Workflow Template</label>
              <select id={`${formId}-workflow`} value={values.workflow} onChange={(event) => updateValue('workflow', event.target.value)} className={fieldClassName}>
                <option value="">Not assigned</option>
                {workflowTemplates.map((workflow) => (
                  <option key={workflow.id} value={textValue(workflow, 0)}>{textValue(workflow, 0)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${formId}-summary`} className="mb-1.5 block text-xs font-semibold text-[#303846]">Summary</label>
              <textarea
                id={`${formId}-summary`}
                rows={3}
                maxLength={500}
                value={values.summary}
                onChange={(event) => updateValue('summary', event.target.value)}
                placeholder="Write a short service summary"
                className="w-full resize-none rounded-lg border border-[#D6DAE0] bg-white px-3 py-2.5 text-sm leading-5 text-[#303846] outline-none transition placeholder:text-[#A0A8B4] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor={`${formId}-color-text`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
              Color <RequiredMark />
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={values.color}
                onChange={(event) => updateValue('color', event.target.value.toUpperCase())}
                aria-label={`${label} color picker`}
                className="h-10 w-12 cursor-pointer rounded-lg border border-[#D6DAE0] bg-white p-1"
              />
              <input
                id={`${formId}-color-text`}
                required
                pattern="#[0-9A-Fa-f]{6}"
                value={values.color}
                onChange={(event) => updateValue('color', event.target.value.toUpperCase())}
                placeholder="#8C1010"
                className={`${fieldClassName} font-mono`}
              />
            </div>
          </div>
        )}

        {!isInternalService ? (
          <div>
            <label htmlFor={`${formId}-sort-order`} className="mb-1.5 block text-xs font-semibold text-[#303846]">Sort Order</label>
            <input
              id={`${formId}-sort-order`}
              type="number"
              min={0}
              step={1}
              value={values.sortOrder}
              onChange={(event) => updateValue('sortOrder', Number(event.target.value))}
              className={fieldClassName}
            />
          </div>
        ) : null}

        <div className="rounded-lg border border-[#E1E4E8] bg-[#FAFBFC] px-3.5 py-3">
          <label className={`flex items-center gap-2.5 text-xs font-semibold text-[#303846] ${isSystemRecord ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={values.isActive}
              disabled={isSystemRecord}
              onChange={(event) => updateValue('isActive', event.target.checked)}
              className="size-4 rounded border-[#B8C0CB] accent-[#8C1010]"
            />
            Active
          </label>
          {isSystemRecord ? <p className="mt-1.5 pl-6 text-[10px] leading-4 text-[#8A94A3]">System records must remain active to protect application workflows.</p> : null}
        </div>
      </form>
    </AdminModal>
  );
}
