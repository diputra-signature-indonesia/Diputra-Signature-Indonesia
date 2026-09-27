'use client';

import {
  deleteQuestionAnswerAction,
  reorderQuestionAnswersAction,
  saveQuestionAnswerAction,
  type SaveQuestionAnswerInput,
} from '@/app/admin/question-answers/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { AdminQuestionAnswer } from '@/lib/supabase/queries/question-answer-management';
import { Eye, EyeOff, GripVertical, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';

type Scope = 'service' | 'global';
type Editor = { item?: AdminQuestionAnswer; scope: Scope } | null;
type DragState = { id: string; index: number; x: number; y: number };

const inputClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10';
const textareaClass = `${inputClass} h-auto resize-none py-2.5 leading-5`;

function QuestionAnswerForm({ editor, service, items, pending, onClose, onSave }: {
  editor: NonNullable<Editor>;
  service: { id: string; title: string };
  items: AdminQuestionAnswer[];
  pending: boolean;
  onClose: () => void;
  onSave: (input: SaveQuestionAnswerInput) => void;
}) {
  const item = editor.item;
  const initialScope: Scope = item ? (item.services_categories_id ? 'service' : 'global') : editor.scope;
  const [scope, setScope] = useState<Scope>(initialScope);
  const [question, setQuestion] = useState(item?.question ?? '');
  const [answer, setAnswer] = useState(item?.answer ?? '');
  const [isVisible, setIsVisible] = useState(item?.is_visible ?? true);

  function submit(event: FormEvent) {
    event.preventDefault();
    const scopeItems = items.filter((value) => scope === 'global' ? !value.services_categories_id : value.services_categories_id === service.id);
    onSave({
      id: item?.id,
      expectedVersion: item?.version,
      categoryId: scope === 'service' ? service.id : null,
      question,
      answer,
      sortOrder: item && initialScope === scope ? Number(item.sort_order) : scopeItems.length + 1,
      isVisible,
    });
  }

  return <AdminModal open onClose={pending ? () => undefined : onClose} title={item ? 'Edit Q&A' : 'Add Q&A'} description={`Manage a question for ${service.title} or the Global scope.`} size="lg" footer={<><button type="button" disabled={pending} onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">Cancel</button><button type="submit" form="question-answer-form" disabled={pending || !question.trim() || !answer.trim()} className="h-9 rounded-lg bg-[#9F1010] px-5 text-xs font-semibold text-white disabled:bg-[#C9CDD3]">{pending ? 'Saving...' : 'Save Q&A'}</button></>}>
    <form id="question-answer-form" onSubmit={submit} className="space-y-4">
      <div><label htmlFor="qna-scope" className="mb-1.5 block text-xs font-semibold text-[#303846]">Display Scope</label><select id="qna-scope" value={scope} onChange={(event) => setScope(event.target.value as Scope)} className={inputClass}><option value="service">{service.title}</option><option value="global">Global — all non-Service pages</option></select></div>
      <div><label htmlFor="qna-question" className="mb-1.5 block text-xs font-semibold text-[#303846]">Question *</label><textarea id="qna-question" rows={2} required maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} className={textareaClass} /></div>
      <div><label htmlFor="qna-answer" className="mb-1.5 block text-xs font-semibold text-[#303846]">Answer *</label><textarea id="qna-answer" rows={6} required maxLength={10000} value={answer} onChange={(event) => setAnswer(event.target.value)} className={textareaClass} /></div>
      <label className="flex items-start gap-3 rounded-lg border border-[#E1E4E8] bg-[#FAFBFC] p-3.5"><input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} className="mt-0.5 size-4 accent-[#8C1010]" /><span><span className="block text-xs font-semibold text-[#303846]">Public</span><span className="mt-1 block text-[10px] text-[#7B8491]">Show this Q&A on the client website.</span></span></label>
    </form>
  </AdminModal>;
}

export function QuestionAnswerModal({ open, onClose, service, initialItems }: {
  open: boolean;
  onClose: () => void;
  service: { id: string; title: string };
  initialItems: AdminQuestionAnswer[];
}) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const origin = useRef<{ id: string; pointerId: number; x: number; y: number } | null>(null);
  const activeDrag = useRef<DragState | null>(null);
  const [items, setItems] = useState(initialItems);
  const [scope, setScope] = useState<Scope>('service');
  const [editor, setEditor] = useState<Editor>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setItems(initialItems), [initialItems]);
  const scopedItems = useMemo(() => items
    .filter((item) => scope === 'global' ? !item.services_categories_id : item.services_categories_id === service.id)
    .sort((left, right) => Number(left.sort_order) - Number(right.sort_order) || (left.created_at ?? '').localeCompare(right.created_at ?? '') || left.id.localeCompare(right.id)), [items, scope, service.id]);

  function finish(result: { ok: boolean; message: string }, closeEditor = false) {
    setNotice(result);
    if (result.ok) {
      if (closeEditor) setEditor(null);
      router.refresh();
    }
  }

  function save(input: SaveQuestionAnswerInput) {
    startTransition(async () => finish(await saveQuestionAnswerAction(input), true));
  }

  function toggle(item: AdminQuestionAnswer) {
    startTransition(async () => finish(await saveQuestionAnswerAction({ id: item.id, expectedVersion: item.version, categoryId: item.services_categories_id, question: item.question, answer: item.answer, sortOrder: Number(item.sort_order), isVisible: !item.is_visible })));
  }

  function remove(item: AdminQuestionAnswer) {
    if (!window.confirm(`Delete “${item.question}”? The Q&A will be removed from the public website.`)) return;
    startTransition(async () => finish(await deleteQuestionAnswerAction({ id: item.id, expectedVersion: item.version })));
  }

  function persistOrder(ordered: AdminQuestionAnswer[], previous: AdminQuestionAnswer[]) {
    setItems((current) => {
      const ids = new Set(ordered.map((item) => item.id));
      return [...current.filter((item) => !ids.has(item.id)), ...ordered.map((item, index) => ({ ...item, sort_order: index + 1 }))];
    });
    startTransition(async () => {
      const result = await reorderQuestionAnswersAction({ categoryId: scope === 'service' ? service.id : null, orderedIds: ordered.map((item) => item.id) });
      if (!result.ok) setItems((current) => [...current.filter((item) => !previous.some((value) => value.id === item.id)), ...previous]);
      finish(result);
    });
  }

  function startDrag(item: AdminQuestionAnswer, event: ReactPointerEvent<HTMLButtonElement>) {
    if (pending || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = { id: item.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function updateDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = origin.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (!activeDrag.current && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return;
    const cards = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-qna-id]') ?? [])].filter((card) => card.dataset.qnaId !== start.id);
    const index = cards.filter((card) => event.clientY >= card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2).length;
    const next = { id: start.id, index, x: event.clientX, y: event.clientY };
    activeDrag.current = next;
    setDrag(next);
  }

  function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = origin.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const target = activeDrag.current;
    origin.current = null;
    activeDrag.current = null;
    setDrag(null);
    if (!target || pending) return;
    const previous = [...scopedItems];
    const moved = previous.find((item) => item.id === start.id);
    if (!moved) return;
    const ordered = previous.filter((item) => item.id !== start.id);
    ordered.splice(target.index, 0, moved);
    if (ordered.every((item, index) => item.id === previous[index]?.id)) return;
    persistOrder(ordered, previous);
  }

  function keyMove(item: AdminQuestionAnswer, direction: -1 | 1) {
    if (pending) return;
    const previous = [...scopedItems];
    const index = previous.findIndex((value) => value.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= previous.length) return;
    const ordered = [...previous];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    persistOrder(ordered, previous);
  }

  if (!open) return null;
  let shown = 0;
  return <>
    <AdminModal open onClose={pending ? () => undefined : onClose} title="Manage Q&A" description={`Arrange Q&A for ${service.title} and the Global website scope.`} size="xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-[#D9DDE3] bg-[#F8F9FA] p-1">
          <button type="button" onClick={() => { setScope('service'); setNotice(null); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${scope === 'service' ? 'bg-white text-[#8C1010] shadow-sm' : 'text-[#667181]'}`}>{service.title}</button>
          <button type="button" onClick={() => { setScope('global'); setNotice(null); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${scope === 'global' ? 'bg-white text-[#8C1010] shadow-sm' : 'text-[#667181]'}`}>Global</button>
        </div>
        <button type="button" disabled={pending} onClick={() => setEditor({ scope })} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white disabled:opacity-50"><Plus className="size-4" />Add Q&A</button>
      </div>
      {notice ? <p className={`mb-4 rounded-lg border px-3 py-2 text-xs ${notice.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.message}</p> : null}
      <p className="mb-3 text-[11px] text-[#7B8491]">Drag the handle to change the order inside this scope. Service Q&A is always displayed before Global Q&A on Service pages.</p>
      <div ref={listRef} className="space-y-2">
        {scopedItems.map((item) => {
          const marker = drag?.index === shown;
          if (item.id !== drag?.id) shown++;
          return <div key={item.id}>{marker ? <div className="mb-2 h-1 rounded-full bg-[#9F1010]" /> : null}<article data-qna-id={item.id} className={`flex items-start gap-3 rounded-lg border border-[#DDE1E6] bg-white p-3 ${drag?.id === item.id ? 'opacity-35' : ''}`}>
            <button type="button" aria-label={`Drag ${item.question}. Use arrow keys to reorder.`} disabled={pending} onPointerDown={(event) => startDrag(item, event)} onPointerMove={updateDrag} onPointerUp={finishDrag} onPointerCancel={() => { origin.current = null; activeDrag.current = null; setDrag(null); }} onKeyDown={(event) => { if (event.key === 'ArrowUp') { event.preventDefault(); keyMove(item, -1); } if (event.key === 'ArrowDown') { event.preventDefault(); keyMove(item, 1); } }} className="mt-0.5 cursor-grab rounded p-1 text-[#7B8491] hover:bg-[#F2F4F7] active:cursor-grabbing" style={{ touchAction: 'none' }}><GripVertical className="size-4" /></button>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F8E9E9] text-[10px] font-bold text-[#8C1010]">{scopedItems.findIndex((value) => value.id === item.id) + 1}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#202938]">{item.question}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#707988]">{item.answer}</p><span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${item.is_visible ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{item.is_visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}{item.is_visible ? 'Public' : 'Hidden'}</span></div>
            <div className="flex shrink-0 gap-1"><button type="button" disabled={pending} onClick={() => toggle(item)} title={item.is_visible ? 'Hide Q&A' : 'Publish Q&A'} className="inline-flex size-8 items-center justify-center rounded-md text-[#667181] hover:bg-[#F2F4F7]">{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : item.is_visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button><button type="button" disabled={pending} onClick={() => setEditor({ item, scope })} title="Edit Q&A" className="inline-flex size-8 items-center justify-center rounded-md text-[#667181] hover:bg-[#F2F4F7]"><Pencil className="size-3.5" /></button><button type="button" disabled={pending} onClick={() => remove(item)} title="Delete Q&A" className="inline-flex size-8 items-center justify-center rounded-md text-[#A51919] hover:bg-[#FFF0F0]"><Trash2 className="size-3.5" /></button></div>
          </article></div>;
        })}
        {drag?.index === shown ? <div className="h-1 rounded-full bg-[#9F1010]" /> : null}
        {!scopedItems.length ? <div className="rounded-lg border border-dashed border-[#CCD2DA] px-6 py-12 text-center text-sm text-[#7B8491]">No Q&A has been added to this scope.</div> : null}
      </div>
    </AdminModal>
    {editor ? <QuestionAnswerForm editor={editor} service={service} items={items} pending={pending} onClose={() => setEditor(null)} onSave={save} /> : null}
    {drag ? <div aria-hidden="true" className="pointer-events-none fixed z-[100] max-w-sm rounded-lg border border-[#9F1010] bg-white px-3 py-2 text-xs font-semibold text-[#202938] shadow-xl" style={{ left: drag.x + 14, top: drag.y + 14 }}>{scopedItems.find((item) => item.id === drag.id)?.question}</div> : null}
  </>;
}
