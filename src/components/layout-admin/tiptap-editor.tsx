'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import { BLOG_IMAGE_ACCEPT } from '@/lib/blog-image-storage';
import { ImageWithSize } from '@/lib/tiptap-image-resizable';
import { uploadEditorImage } from '@/lib/uploadImage';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, BrushCleaning, Code,
  Columns3, Expand, Heading2, Heading3, Highlighter, Image as ImageIcon,
  Italic, Link as LinkIcon, List, ListOrdered, LoaderCircle, Maximize2, Minus,
  Pilcrow, Quote, Redo, Rows3, SquareCode, Table2, Trash2, Underline as UnderlineIcon,
  Undo, Unlink, Video,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const inputClass = 'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#263142] outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[#303846]';

function replaceBodyH1(document: Document) {
  document.querySelectorAll('h1').forEach((heading) => {
    const replacement = document.createElement('h2');
    [...heading.attributes].forEach((attribute) => replacement.setAttribute(attribute.name, attribute.value));
    replacement.innerHTML = heading.innerHTML;
    heading.replaceWith(replacement);
  });
}

function normalizeStoredHtml(html: string) {
  if (!html) return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  replaceBodyH1(document);
  return document.body.innerHTML;
}

function cleanPastedHtml(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());
  replaceBodyH1(document);
  document.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name === 'href' || attribute.name === 'src' || attribute.name === 'alt') return;
      node.removeAttribute(attribute.name);
    });
  });
  return document.body.innerHTML;
}

function ToolbarButton({ active, onMouseDown, disabled, children, title }: {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onMouseDown={(event) => { event.preventDefault(); onMouseDown(event); }}
      className={`rounded-lg p-2 transition ${disabled ? 'cursor-not-allowed opacity-35' : active ? 'bg-[#8C1010] text-white' : 'text-[#536070] hover:bg-white hover:text-[#8C1010]'}`}>
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-gray-300" />;
}

type ImageDraft = { file: File | null; src: string; alt: string; caption: string; credit: string };
type LinkDraft = { url: string; label: string; newTab: boolean };

type Props = {
  onChange?: (html: string) => void;
  onImageUploaded?: (path: string) => void;
  initialContent?: string;
};

export default function TiptapEditor({ initialContent = '', onChange, onImageUploaded }: Props) {
  const [, forceUpdate] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [imageOpen, setImageOpen] = useState(false);
  const [imageDraft, setImageDraft] = useState<ImageDraft>({ file: null, src: '', alt: '', caption: '', credit: '' });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState<LinkDraft>({ url: 'https://', label: '', newTab: true });
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const hydratedRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, underline: false, heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, protocols: ['http', 'https', 'mailto', 'tel'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageWithSize.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: true, renderWrapper: true } }),
      Youtube.configure({ nocookie: true, controls: true, allowFullscreen: true, width: 800, height: 450 }),
    ],
    content: '',
    editorProps: {
      transformPastedHTML: cleanPastedHtml,
      attributes: { 'aria-label': 'Article content editor' },
    },
    onSelectionUpdate() { forceUpdate((value) => value + 1); },
    onTransaction() { forceUpdate((value) => value + 1); },
    onUpdate({ editor: currentEditor }) { onChange?.(currentEditor.getHTML()); },
  });

  useEffect(() => {
    if (!editor || hydratedRef.current) return;
    editor.commands.setContent(normalizeStoredHtml(initialContent), { emitUpdate: false });
    hydratedRef.current = true;
  }, [editor, initialContent]);

  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [fullscreen]);

  if (!editor) return null;
  const activeEditor = editor;

  function openImageModal() {
    const attributes = activeEditor.isActive('image') ? activeEditor.getAttributes('image') : {};
    setImageDraft({ file: null, src: String(attributes.src ?? ''), alt: String(attributes.alt ?? ''), caption: String(attributes.caption ?? ''), credit: String(attributes.credit ?? '') });
    setModalError('');
    setImageOpen(true);
  }

  async function saveImage() {
    if (!imageDraft.alt.trim()) { setModalError('Alt text wajib diisi agar gambar dapat dipahami pembaca dan mesin pencari.'); return; }
    if (!imageDraft.file && !imageDraft.src) { setModalError('Pilih gambar yang akan dimasukkan.'); return; }
    setBusy(true);
    setModalError('');
    try {
      let src = imageDraft.src;
      if (imageDraft.file) {
        const uploaded = await uploadEditorImage(imageDraft.file);
        src = uploaded.publicUrl;
        onImageUploaded?.(uploaded.path);
      }
      const attributes = { src, alt: imageDraft.alt.trim(), title: imageDraft.caption.trim() || imageDraft.alt.trim(), caption: imageDraft.caption.trim() || null, credit: imageDraft.credit.trim() || null };
      if (activeEditor.isActive('image')) activeEditor.chain().focus().updateAttributes('image', attributes).run();
      else activeEditor.chain().focus().setImage(attributes).createParagraphNear().run();
      setImageOpen(false);
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Gambar gagal diunggah.');
    } finally {
      setBusy(false);
    }
  }

  function openLinkModal() {
    const { from, to } = activeEditor.state.selection;
    const attributes = activeEditor.getAttributes('link');
    setLinkDraft({ url: String(attributes.href ?? 'https://'), label: activeEditor.state.doc.textBetween(from, to, ' ') || '', newTab: attributes.target === '_blank' || !attributes.href });
    setModalError('');
    setLinkOpen(true);
  }

  function saveLink() {
    const url = linkDraft.url.trim();
    if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(url)) { setModalError('Gunakan URL https://, link internal /..., mailto:, atau tel:.'); return; }
    const attributes = { href: url, target: linkDraft.newTab ? '_blank' : null, rel: linkDraft.newTab ? 'noopener noreferrer' : null };
    const { from, to, empty } = activeEditor.state.selection;
    const selectedText = empty ? '' : activeEditor.state.doc.textBetween(from, to, ' ');
    if (empty) activeEditor.chain().focus().insertContent({ type: 'text', text: linkDraft.label.trim() || url, marks: [{ type: 'link', attrs: attributes }] }).run();
    else if (linkDraft.label.trim() && linkDraft.label.trim() !== selectedText) activeEditor.chain().focus().insertContentAt({ from, to }, { type: 'text', text: linkDraft.label.trim(), marks: [{ type: 'link', attrs: attributes }] }).run();
    else activeEditor.chain().focus().extendMarkRange('link').setLink(attributes).run();
    setLinkOpen(false);
  }

  function saveYoutube() {
    try {
      const parsed = new URL(youtubeUrl.trim());
      if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname)) throw new Error('invalid host');
    } catch {
      setModalError('Masukkan URL video YouTube yang valid.');
      return;
    }
    activeEditor.chain().focus().setYoutubeVideo({ src: youtubeUrl.trim(), width: 800, height: 450 }).run();
    setYoutubeOpen(false);
    setYoutubeUrl('');
  }

  const toolbar = (
    <div className="sticky top-[65px] z-20 flex flex-wrap items-center gap-1 border-b border-[#E4E7EB] bg-[#F7F8FA] px-4 py-2">
      <ToolbarButton title="Paragraph" active={editor.isActive('paragraph')} onMouseDown={() => editor.chain().focus().setParagraph().run()}><Pilcrow className="size-4" /></ToolbarButton>
      <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></ToolbarButton>
      <ToolbarButton title="Heading 3" active={editor.isActive('heading', { level: 3 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton title="Bold" active={editor.isActive('bold')} onMouseDown={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')} onMouseDown={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive('underline')} onMouseDown={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="size-4" /></ToolbarButton>
      <label title="Text color" className="relative flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#536070] hover:bg-white"><span className="text-sm font-bold">A</span><input aria-label="Text color" type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} /></label>
      <label title="Highlight color" className={`relative flex size-8 cursor-pointer items-center justify-center rounded-lg ${editor.isActive('highlight') ? 'bg-[#8C1010] text-white' : 'text-[#536070] hover:bg-white'}`}><Highlighter className="size-4" /><input aria-label="Highlight color" type="color" defaultValue="#fff1a8" className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()} /></label>
      <Divider />
      <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onMouseDown={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="size-4" /></ToolbarButton>
      <ToolbarButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onMouseDown={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="size-4" /></ToolbarButton>
      <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onMouseDown={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="size-4" /></ToolbarButton>
      <ToolbarButton title="Justify" active={editor.isActive({ textAlign: 'justify' })} onMouseDown={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify className="size-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onMouseDown={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></ToolbarButton>
      <ToolbarButton title="Ordered list" active={editor.isActive('orderedList')} onMouseDown={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onMouseDown={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton title="Inline code" active={editor.isActive('code')} onMouseDown={() => editor.chain().focus().toggleCode().run()}><Code className="size-4" /></ToolbarButton>
      <ToolbarButton title="Code block" active={editor.isActive('codeBlock')} onMouseDown={() => editor.chain().focus().toggleCodeBlock().run()}><SquareCode className="size-4" /></ToolbarButton>
      <ToolbarButton title="Horizontal rule" onMouseDown={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton title="Add or edit link" active={editor.isActive('link')} onMouseDown={openLinkModal}><LinkIcon className="size-4" /></ToolbarButton>
      <ToolbarButton title="Remove link" disabled={!editor.isActive('link')} onMouseDown={() => editor.chain().focus().unsetLink().run()}><Unlink className="size-4" /></ToolbarButton>
      <ToolbarButton title="Add or edit image" active={editor.isActive('image')} onMouseDown={openImageModal}><ImageIcon className="size-4" /></ToolbarButton>
      <ToolbarButton title="Embed YouTube" onMouseDown={() => { setModalError(''); setYoutubeOpen(true); }}><Video className="size-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton title="Insert table" onMouseDown={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 className="size-4" /></ToolbarButton>
      {editor.isActive('table') ? <>
        <ToolbarButton title="Add table row" onMouseDown={() => editor.chain().focus().addRowAfter().run()}><Rows3 className="size-4" /></ToolbarButton>
        <ToolbarButton title="Add table column" onMouseDown={() => editor.chain().focus().addColumnAfter().run()}><Columns3 className="size-4" /></ToolbarButton>
        <ToolbarButton title="Delete selected row" onMouseDown={() => editor.chain().focus().deleteRow().run()}><Minus className="size-4" /></ToolbarButton>
        <ToolbarButton title="Delete selected column" onMouseDown={() => editor.chain().focus().deleteColumn().run()}><Columns3 className="size-4 rotate-180" /></ToolbarButton>
        <ToolbarButton title="Delete table" onMouseDown={() => editor.chain().focus().deleteTable().run()}><Trash2 className="size-4" /></ToolbarButton>
      </> : null}
      <Divider />
      <ToolbarButton title="Clear formatting" onMouseDown={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><BrushCleaning className="size-4" /></ToolbarButton>
      <ToolbarButton title="Undo" disabled={!editor.can().chain().focus().undo().run()} onMouseDown={() => editor.chain().focus().undo().run()}><Undo className="size-4" /></ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().chain().focus().redo().run()} onMouseDown={() => editor.chain().focus().redo().run()}><Redo className="size-4" /></ToolbarButton>
      <ToolbarButton title={fullscreen ? 'Exit fullscreen' : 'Fullscreen editor'} onMouseDown={() => setFullscreen((value) => !value)}>{fullscreen ? <Expand className="size-4" /> : <Maximize2 className="size-4" />}</ToolbarButton>
    </div>
  );

  return (
    <>
      <div className={fullscreen ? 'fixed inset-0 z-[65] flex flex-col bg-white' : 'bg-white'}>
        {toolbar}
        <EditorContent editor={editor} className={`tiptap article-editor-content font-raleway w-full max-w-none overflow-y-auto break-words px-6 py-5 text-sm leading-7 focus:outline-none ${fullscreen ? 'flex-1' : 'min-h-[420px]'}`} />
      </div>

      <AdminModal open={imageOpen} onClose={() => !busy && setImageOpen(false)} title={editor.isActive('image') ? 'Edit Article Image' : 'Insert Article Image'} description="Alt text is required. Caption and photo credit are optional."
        footer={<><button type="button" disabled={busy} onClick={() => setImageOpen(false)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#4E5968]">Cancel</button><button type="button" disabled={busy} onClick={saveImage} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#8C1010] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" /> : null} Save Image</button></>}>
        <div className="space-y-4">
          <label><span className={labelClass}>Image {imageDraft.src ? '(optional when editing)' : '*'}</span><input type="file" accept={BLOG_IMAGE_ACCEPT} onChange={(event) => setImageDraft((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} className="block w-full rounded-lg border border-[#D6DAE0] p-2 text-xs" /></label>
          <label><span className={labelClass}>Alt Text *</span><input value={imageDraft.alt} onChange={(event) => setImageDraft((current) => ({ ...current, alt: event.target.value }))} maxLength={200} placeholder="Describe what is visible in the image" className={inputClass} /></label>
          <label><span className={labelClass}>Caption</span><input value={imageDraft.caption} onChange={(event) => setImageDraft((current) => ({ ...current, caption: event.target.value }))} maxLength={240} placeholder="Context shown below the image" className={inputClass} /></label>
          <label><span className={labelClass}>Photo Credit / Source</span><input value={imageDraft.credit} onChange={(event) => setImageDraft((current) => ({ ...current, credit: event.target.value }))} maxLength={120} placeholder="Photographer or source" className={inputClass} /></label>
          {modalError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{modalError}</p> : null}
        </div>
      </AdminModal>

      <AdminModal open={linkOpen} onClose={() => setLinkOpen(false)} title="Insert Link" description="External links can open safely in a new tab."
        footer={<><button type="button" onClick={() => setLinkOpen(false)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#4E5968]">Cancel</button><button type="button" onClick={saveLink} className="h-9 rounded-lg bg-[#8C1010] px-4 text-xs font-semibold text-white">Apply Link</button></>}>
        <div className="space-y-4"><label><span className={labelClass}>URL *</span><input value={linkDraft.url} onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))} className={inputClass} /></label><label><span className={labelClass}>Displayed Text</span><input value={linkDraft.label} onChange={(event) => setLinkDraft((current) => ({ ...current, label: event.target.value }))} className={inputClass} /></label><label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={linkDraft.newTab} onChange={(event) => setLinkDraft((current) => ({ ...current, newTab: event.target.checked }))} /> Open in new tab</label>{modalError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{modalError}</p> : null}</div>
      </AdminModal>

      <AdminModal open={youtubeOpen} onClose={() => setYoutubeOpen(false)} title="Embed YouTube Video" description="Only youtube.com and youtu.be links are accepted."
        footer={<><button type="button" onClick={() => setYoutubeOpen(false)} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#4E5968]">Cancel</button><button type="button" onClick={saveYoutube} className="h-9 rounded-lg bg-[#8C1010] px-4 text-xs font-semibold text-white">Insert Video</button></>}>
        <div><label><span className={labelClass}>YouTube URL *</span><input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." className={inputClass} /></label>{modalError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{modalError}</p> : null}</div>
      </AdminModal>
    </>
  );
}
