'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import { AdminRemoteSelect } from '@/components/layout-admin/admin-remote-select';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { type MasterDataCategoryId, type MasterDataRow } from '@/data/admin-master-data/master-data';
import { useId, useState, type FormEvent } from 'react';
import { WorkflowStepsEditor, type WorkflowStepFormValue } from './workflow-steps-editor';

export type MasterDataFormCategoryId = MasterDataCategoryId;

export type MasterDataFormValues = {
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  summary: string;
  workflowTemplateId: string;
  internalCategoryId: string;
  steps: WorkflowStepFormValue[];
};

type MasterDataFormModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  categoryId: MasterDataFormCategoryId;
  row?: MasterDataRow;
  workflowTemplates?: MasterDataRow[];
  internalCategories?: MasterDataRow[];
  defaultInternalCategoryId?: string;
  errorMessage?: string;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: MasterDataFormValues) => void;
};

const fieldClassName =
  'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none transition placeholder:text-[#A0A8B4] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10 disabled:cursor-not-allowed disabled:bg-[#F1F3F5] disabled:text-[#8A94A3]';

const categoryLabels: Record<MasterDataFormCategoryId, string> = {
  priorities: 'Priority',
  'internal-services': 'Internal Service',
  'internal-service-categories': 'Internal Service Category',
  'task-statuses': 'Task Status',
  'job-statuses': 'Job Status',
  'job-titles': 'Job Title',
  'workflow-templates': 'Workflow Template',
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

function initialValues(categoryId: MasterDataFormCategoryId, row?: MasterDataRow, internalCategories: MasterDataRow[] = []): MasterDataFormValues {
  if (categoryId === 'workflow-templates') {
    const stepCell = row?.cells[1];
    const steps = stepCell?.type === 'steps' ? stepCell.items.map((name, index) => ({ id: `existing-step-${index}`, name })) : [{ id: 'initial-step', name: '' }];

    return {
      code: row?.code ?? '',
      name: textValue(row, 0),
      color: '#8C1010',
      sortOrder: 0,
      isActive: row?.isActive ?? true,
      summary: secondaryValue(row, 0),
      workflowTemplateId: '',
      internalCategoryId: '',
      steps,
    };
  }

  if (categoryId === 'internal-services') {
    const prefix = row?.internalCategoryCode ?? internalCategories.find((category) => category.id === row?.internalCategoryId)?.code;
    return {
      code: prefix ? (row?.code ?? '').slice(prefix.length + 1) : (row?.code ?? ''),
      name: textValue(row, 0),
      color: '#8C1010',
      sortOrder: 0,
      isActive: row?.isActive ?? true,
      summary: secondaryValue(row, 0),
      workflowTemplateId: row?.workflowTemplateId ?? '',
      internalCategoryId: row?.internalCategoryId ?? '',
      steps: [],
    };
  }

  if (categoryId === 'job-titles' || categoryId === 'internal-service-categories') {
    return {
      code: textValue(row, 1),
      name: textValue(row, 0),
      color: '#8C1010',
      sortOrder: Number(textValue(row, 2)) || 0,
      isActive: row?.isActive ?? true,
      summary: '',
      workflowTemplateId: '',
      internalCategoryId: '',
      steps: [],
    };
  }

  return {
    code: textValue(row, 1),
    name: textValue(row, 0),
    color: colorValue(row, 2),
    sortOrder: Number(textValue(row, 3)) || 0,
    isActive: row?.isActive ?? true,
    summary: '',
    workflowTemplateId: '',
    internalCategoryId: '',
    steps: [],
  };
}

function RequiredMark() {
  return <span className="text-[#C32929]">*</span>;
}

export function MasterDataFormModal({
  open,
  mode,
  categoryId,
  row,
  internalCategories = [],
  defaultInternalCategoryId = '',
  errorMessage,
  isSaving = false,
  onClose,
  onSave,
}: MasterDataFormModalProps) {
  const formId = useId();
  const [values, setValues] = useState(() => ({
    ...initialValues(categoryId, row, internalCategories),
    ...(categoryId === 'internal-services' && mode === 'add' ? { internalCategoryId: defaultInternalCategoryId } : {}),
  }));
  const label = categoryLabels[categoryId];
  const isSystemRecord = Boolean(row?.isSystem);
  const isInternalService = categoryId === 'internal-services';
  const isWorkflowTemplate = categoryId === 'workflow-templates';
  const isJobTitle = categoryId === 'job-titles';
  const isInternalCategory = categoryId === 'internal-service-categories';
  const categoryLookup = useAdminPage<{ value: string; label: string; code: string }[]>(
    isInternalService && values.internalCategoryId ? `/api/admin/lookups?kind=internal_categories&id=${values.internalCategoryId}` : null
  );
  const codePrefix =
    categoryLookup.data?.find((item) => item.value === values.internalCategoryId)?.code ?? (values.internalCategoryId === row?.internalCategoryId ? (row?.internalCategoryCode ?? '') : '');
  const fullCode = isInternalService && codePrefix ? codePrefix + '_' + values.code : values.code;

  const updateValue = <Key extends keyof MasterDataFormValues>(key: Key, value: MasterDataFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleCodeChange = (value: string) => {
    updateValue('code', value.toUpperCase().replace(/[^A-Z0-9_]/g, ''));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const steps = values.steps.map((step) => ({ ...step, name: step.name.trim() }));
    if (isWorkflowTemplate && (steps.length === 0 || steps.some((step) => !step.name))) return;
    if (isInternalService && (mode === 'add' || row?.internalCategoryId) && (!values.internalCategoryId || !codePrefix || categoryLookup.loading || categoryLookup.error)) return;

    onSave({ ...values, code: values.code.trim(), name: values.name.trim(), summary: values.summary.trim(), steps });
  };

  const addStep = () => {
    setValues((current) => ({
      ...current,
      steps: [...current.steps, { id: `step-${Date.now()}-${current.steps.length}`, name: '' }],
    }));
  };

  const updateStep = (stepId: string, name: string) => {
    setValues((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === stepId ? { ...step, name } : step)),
    }));
  };

  const moveStep = (stepId: string, targetStepId: string) => {
    setValues((current) => {
      const sourceIndex = current.steps.findIndex((step) => step.id === stepId);
      const targetIndex = current.steps.findIndex((step) => step.id === targetStepId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;

      const steps = [...current.steps];
      const [movedStep] = steps.splice(sourceIndex, 1);
      steps.splice(targetIndex, 0, movedStep);
      return { ...current, steps };
    });
  };

  const removeStep = (stepId: string) => {
    setValues((current) => (current.steps.length === 1 ? current : { ...current, steps: current.steps.filter((step) => step.id !== stepId) }));
  };

  return (
    <AdminModal
      open={open}
      onClose={isSaving ? () => undefined : onClose}
      title={`${mode === 'add' ? 'Add' : 'Edit'} ${label}`}
      description={`${mode === 'add' ? 'Create a new' : 'Update the selected'} ${label.toLowerCase()} record.`}
      size={isWorkflowTemplate ? 'lg' : 'md'}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-9 rounded-lg px-4 text-xs font-semibold text-[#4F5968] transition hover:bg-[#ECEFF2] focus-visible:ring-2 focus-visible:ring-[#8C1010]/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={
              isSaving ||
              (isInternalService && (mode === 'add' || Boolean(row?.internalCategoryId)) && (!values.internalCategoryId || !codePrefix || categoryLookup.loading || Boolean(categoryLookup.error)))
            }
            className="h-9 rounded-lg bg-[#8C1010] px-5 text-xs font-semibold text-white transition hover:bg-[#710C0C] focus-visible:ring-2 focus-visible:ring-[#8C1010]/35 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : mode === 'add' ? 'Save Data' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit}>
        {errorMessage ? (
          <p role="alert" className="mb-4 rounded-lg border border-[#F3B9B9] bg-[#FFF0F0] px-3 py-2 text-xs text-[#A51919]">
            {errorMessage}
          </p>
        ) : null}
        <fieldset disabled={isSaving} className="space-y-4 disabled:opacity-75">
          {isInternalService ? (
            <div>
              <label htmlFor={formId + '-category'} className="mb-1.5 block text-xs font-semibold text-[#303846]">
                Internal Category {mode === 'add' || row?.internalCategoryId ? <RequiredMark /> : null}
              </label>
              <AdminRemoteSelect
                kind="internal_categories"
                label="Category"
                value={values.internalCategoryId}
                initialLabel={textValue(row, 2)}
                disabled={isSaving}
                onChange={(value) => updateValue('internalCategoryId', value)}
              />
              <p className="mt-1.5 text-[10px] leading-4 text-[#8A94A3]">Category sets the code prefix automatically. This is separate from Client Services.</p>
            </div>
          ) : null}
          <div>
            <label htmlFor={`${formId}-code`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
              Code <RequiredMark />
            </label>
            <div className="flex">
              {isInternalService && codePrefix ? (
                <span className="flex max-w-[45%] shrink-0 items-center rounded-l-lg border border-r-0 border-[#D6DAE0] bg-[#F1F3F5] px-3 font-mono text-xs break-all text-[#586273]">
                  {codePrefix}_
                </span>
              ) : null}
              <input
                id={`${formId}-code`}
                autoFocus={mode === 'add' && !isInternalService}
                required
                minLength={isInternalCategory || isInternalService ? 1 : 2}
                maxLength={isInternalCategory ? 30 : isInternalService && codePrefix ? Math.max(1, 79 - codePrefix.length) : 80}
                pattern={isInternalService ? '[A-Z0-9]+(_[A-Z0-9]+)*' : isInternalCategory ? '[A-Z][A-Z0-9]*(_[A-Z0-9]+)*' : undefined}
                value={values.code}
                onChange={(event) => handleCodeChange(event.target.value)}
                disabled={mode === 'edit' && !isInternalCategory}
                placeholder={isInternalCategory ? 'COMPANY / VISA' : isInternalService ? 'SETUP / EXTENSION' : 'EXAMPLE_CODE'}
                className={fieldClassName + (isInternalService && codePrefix ? ' min-w-0 rounded-l-none font-mono' : '')}
              />
            </div>
            {isInternalService ? <p className="mt-1.5 font-mono text-[11px] break-all text-[#707988]">Full code: {fullCode || '?'}</p> : null}
            {mode === 'edit' && !isInternalCategory ? (
              <p className="mt-1.5 text-[10px] leading-4 text-[#8A94A3]">
                {isInternalService ? 'The manual suffix is permanent; the prefix follows the selected category.' : 'Code is permanent and cannot be changed after creation.'}
              </p>
            ) : null}
            {isInternalCategory ? (
              <p className="mt-1.5 text-[10px] leading-4 text-[#8A94A3]">Prefix for this category, e.g. VISA produces VISA_EXTENSION. Maximum 30 characters. Editing is locked once used.</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-name`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
              {isInternalService ? 'Service Name' : isWorkflowTemplate ? 'Template Name' : 'Name'} <RequiredMark />
            </label>
            <input
              id={`${formId}-name`}
              autoFocus={mode === 'edit'}
              required
              maxLength={160}
              value={values.name}
              onChange={(event) => updateValue('name', event.target.value)}
              placeholder={isInternalService ? 'Enter service name' : isWorkflowTemplate ? 'Enter workflow template name' : `Enter ${label.toLowerCase()} name`}
              className={fieldClassName}
            />
          </div>

          {isInternalService ? (
            <>
              <div>
                <label htmlFor={`${formId}-workflow`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
                  Workflow Template
                </label>
                <AdminRemoteSelect
                  kind="workflows"
                  label="Workflow"
                  value={values.workflowTemplateId}
                  initialLabel={textValue(row, 3)}
                  disabled={isSaving}
                  onChange={(value) => updateValue('workflowTemplateId', value)}
                />
              </div>
              <div>
                <label htmlFor={`${formId}-summary`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
                  Summary
                </label>
                <textarea
                  id={`${formId}-summary`}
                  rows={3}
                  maxLength={500}
                  value={values.summary}
                  onChange={(event) => updateValue('summary', event.target.value)}
                  placeholder="Write a short service summary"
                  className="w-full resize-none rounded-lg border border-[#D6DAE0] bg-white px-3 py-2.5 text-sm leading-5 text-[#303846] transition outline-none placeholder:text-[#A0A8B4] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
                />
              </div>
            </>
          ) : isWorkflowTemplate ? (
            <>
              <div>
                <label htmlFor={`${formId}-summary`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
                  Description
                </label>
                <textarea
                  id={`${formId}-summary`}
                  rows={3}
                  maxLength={500}
                  value={values.summary}
                  onChange={(event) => updateValue('summary', event.target.value)}
                  placeholder="Describe when this workflow should be used"
                  className="w-full resize-none rounded-lg border border-[#D6DAE0] bg-white px-3 py-2.5 text-sm leading-5 text-[#303846] transition outline-none placeholder:text-[#A0A8B4] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
                />
              </div>

              <WorkflowStepsEditor formId={formId} steps={values.steps} onAdd={addStep} onChange={updateStep} onMove={moveStep} onRemove={removeStep} />
            </>
          ) : isJobTitle || isInternalCategory ? null : (
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

          {!isInternalService && !isWorkflowTemplate && !isInternalCategory ? (
            <div>
              <label htmlFor={`${formId}-sort-order`} className="mb-1.5 block text-xs font-semibold text-[#303846]">
                Sort Order
              </label>
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

          {!isInternalCategory ? (
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
          ) : null}
        </fieldset>
      </form>
    </AdminModal>
  );
}
