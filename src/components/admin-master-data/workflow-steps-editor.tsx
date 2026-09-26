'use client';

import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';

export type WorkflowStepFormValue = {
  id: string;
  name: string;
};

type WorkflowStepsEditorProps = {
  formId: string;
  steps: WorkflowStepFormValue[];
  onAdd: () => void;
  onChange: (stepId: string, name: string) => void;
  onMove: (stepId: string, targetStepId: string) => void;
  onRemove: (stepId: string) => void;
};

const stepFieldClassName =
  'h-10 min-w-0 flex-1 rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none transition placeholder:text-[#A0A8B4] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10';

export function WorkflowStepsEditor({ formId, steps, onAdd, onChange, onMove, onRemove }: WorkflowStepsEditorProps) {
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const draggedStepIdRef = useRef<string | null>(null);
  const draggedPointerIdRef = useRef<number | null>(null);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const moveToPointerPosition = useCallback((clientY: number) => {
    const activeStepId = draggedStepIdRef.current;
    if (!activeStepId) return;

    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-workflow-step-id]'))
      .find((row) => {
        const bounds = row.getBoundingClientRect();
        return clientY >= bounds.top && clientY <= bounds.bottom;
      });
    const targetStepId = target?.dataset.workflowStepId;
    if (targetStepId && targetStepId !== activeStepId) onMoveRef.current(activeStepId, targetStepId);
  }, []);

  useEffect(() => {
    const moveFromPointer = (event: PointerEvent) => {
      const activeStepId = draggedStepIdRef.current;
      if (!activeStepId || event.pointerId !== draggedPointerIdRef.current) return;
      event.preventDefault();

      const modalScroller = document.querySelector<HTMLElement>('[role="dialog"] [data-admin-modal-scroll]');
      if (modalScroller) {
        const bounds = modalScroller.getBoundingClientRect();
        const edge = 48;
        if (event.clientY < bounds.top + edge) modalScroller.scrollTop -= 12;
        if (event.clientY > bounds.bottom - edge) modalScroller.scrollTop += 12;
      }

      moveToPointerPosition(event.clientY);
    };

    const finishPointerDrag = (event: PointerEvent) => {
      if (event.pointerId !== draggedPointerIdRef.current) return;
      draggedStepIdRef.current = null;
      draggedPointerIdRef.current = null;
      setDraggedStepId(null);
    };

    window.addEventListener('pointermove', moveFromPointer, { passive: false });
    window.addEventListener('pointerup', finishPointerDrag);
    window.addEventListener('pointercancel', finishPointerDrag);

    return () => {
      window.removeEventListener('pointermove', moveFromPointer);
      window.removeEventListener('pointerup', finishPointerDrag);
      window.removeEventListener('pointercancel', finishPointerDrag);
    };
  }, [moveToPointerPosition]);

  const finishPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    moveToPointerPosition(event.clientY);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    draggedStepIdRef.current = null;
    draggedPointerIdRef.current = null;
    setDraggedStepId(null);
  };

  const handleKeyboardMove = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();

    const targetIndex = event.key === 'ArrowUp' ? index - 1 : index + 1;
    const targetStep = steps[targetIndex];
    if (targetStep) onMove(steps[index].id, targetStep.id);
  };

  return (
    <fieldset>
      <div className="flex items-start justify-between gap-4">
        <div>
          <legend className="text-xs font-semibold text-[#303846]">
            Ordered Steps <span className="text-[#C32929]">*</span>
          </legend>
          <p className="mt-1 text-[10px] leading-4 text-[#8A94A3]">Drag the handle or use Arrow Up/Down to change the sequence.</p>
        </div>
        <span className="rounded-full bg-[#F2F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#68717E]">{steps.length} {steps.length === 1 ? 'step' : 'steps'}</span>
      </div>

      <div className="mt-3 space-y-2.5">
        {steps.map((step, index) => {
          const isDragging = draggedStepId === step.id;

          return (
            <div
              key={step.id}
              data-workflow-step-id={step.id}
              className={`flex items-center gap-2 rounded-xl border bg-[#FAFBFC] p-2 transition ${isDragging ? 'border-[#8C1010] shadow-[0_6px_18px_rgba(140,16,16,0.12)]' : 'border-[#E1E4E8]'}`}
            >
              <button
                type="button"
                aria-label={`Move step ${index + 1}`}
                title="Drag to reorder. Arrow Up/Down also works."
                onPointerDown={(event) => {
                  if (event.pointerType === 'mouse' && event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  draggedStepIdRef.current = step.id;
                  draggedPointerIdRef.current = event.pointerId;
                  setDraggedStepId(step.id);
                }}
                onPointerUp={finishPointerDrag}
                onPointerCancel={finishPointerDrag}
                onKeyDown={(event) => handleKeyboardMove(event, index)}
                className="flex size-10 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-[#7B8491] transition hover:bg-[#ECEFF2] hover:text-[#8C1010] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/25"
              >
                <GripVertical aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </button>

              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F4E8E8] text-[11px] font-semibold text-[#8C1010]">{index + 1}</span>

              <label htmlFor={`${formId}-step-${step.id}`} className="sr-only">Step {index + 1} name</label>
              <input
                id={`${formId}-step-${step.id}`}
                required
                pattern=".*\S.*"
                title="Step name cannot be empty"
                maxLength={160}
                value={step.name}
                onChange={(event) => onChange(step.id, event.target.value)}
                placeholder={index === 0 ? 'Example: Analysis' : 'Enter the next step'}
                className={stepFieldClassName}
              />

              <button
                type="button"
                onClick={() => onRemove(step.id)}
                disabled={steps.length === 1}
                aria-label={`Delete step ${index + 1}`}
                title={steps.length === 1 ? 'A workflow requires at least one step' : 'Delete step'}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#8A94A3] transition hover:bg-[#FFF0F0] hover:text-[#C32929] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#8A94A3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C32929]/25"
              >
                <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-[#C5CAD2] bg-white px-3.5 text-xs font-semibold text-[#596474] transition hover:border-[#8C1010] hover:bg-[#FFF8F8] hover:text-[#8C1010] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/25"
      >
        <Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />
        Add Step
      </button>
    </fieldset>
  );
}
