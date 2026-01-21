'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { ImageWithSize } from '@/lib/tiptap-image-resizable';

import { uploadEditorImage } from '@/lib/uploadImage';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Code,
  SquareCode,
  Minus,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
} from 'lucide-react';

import { useEffect, useRef, useState } from 'react';

function ToolbarButton({
  active,
  onMouseDown,
  disabled,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown(e);
      }}
      className={`rounded p-2 transition ${disabled ? 'cursor-not-allowed opacity-40' : active ? 'bg-gray-600 text-white' : 'hover:bg-gray-200'}`}
    >
      {children}
    </button>
  );
}

type Props = {
  onChange?: (html: string) => void;
  onImageUploaded?: (path: string) => void;
  initialContent?: string; // ✅ new
};

export default function TiptapEditor({ initialContent = '', onChange, onImageUploaded }: Props) {
  const [, forceUpdate] = useState(0);
  const hydratedRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      // optional (kalau kamu masih mau font tools nanti)
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      ImageWithSize.configure({ inline: false, allowBase64: false }),
    ],
    content: '',
    onSelectionUpdate() {
      forceUpdate((x) => x + 1);
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (hydratedRef.current) return;
    if (!initialContent) return;

    editor.commands.setContent(initialContent, { emitUpdate: false }); // false = jangan create history step
    hydratedRef.current = true;
  }, [editor, initialContent]);

  useEffect(() => {
    if (!editor) return;
    if (!initialContent && hydratedRef.current) {
      // kalau kamu butuh reset saat clear draft:
      // editor.commands.setContent('', false);
      // hydratedRef.current = false;
    }
  }, [editor, initialContent]);

  if (!editor) return null;

  async function insertImage() {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const { publicUrl, path } = await uploadEditorImage(file);
      editor
        .chain()
        .focus()
        .setImage({ src: publicUrl })
        .createParagraphNear() // ⬅️ INI
        .run();

      onImageUploaded?.(path);
    };

    input.click();
  }

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', previousUrl ?? 'https://');
    if (url === null) return; // cancel
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url.trim() }).run();
  }

  return (
    <div className="rounded-sm border border-gray-300">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-gray-100 px-3 py-2">
        {/* paragraph + headings */}
        <ToolbarButton title="Paragraph" active={editor.isActive('paragraph')} onMouseDown={() => editor.chain().focus().setParagraph().run()}>
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Heading 1" active={editor.isActive('heading', { level: 1 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 1 }).setFontFamily('font-raleway').run()}>
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Heading 3" active={editor.isActive('heading', { level: 3 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* marks */}
        <ToolbarButton title="Bold" active={editor.isActive('bold')} onMouseDown={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Italic" active={editor.isActive('italic')} onMouseDown={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Underline" active={editor.isActive('underline')} onMouseDown={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* lists + quote */}
        <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onMouseDown={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Ordered list" active={editor.isActive('orderedList')} onMouseDown={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Blockquote" active={editor.isActive('blockquote')} onMouseDown={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* code */}
        <ToolbarButton title="Inline code" active={editor.isActive('code')} onMouseDown={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Code block" active={editor.isActive('codeBlock')} onMouseDown={() => editor.chain().focus().toggleCodeBlock().run()}>
          <SquareCode className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Horizontal rule" onMouseDown={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* link */}
        <ToolbarButton title="Set link" active={editor.isActive('link')} onMouseDown={() => setLink()}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Remove link" disabled={!editor.isActive('link')} onMouseDown={() => editor.chain().focus().unsetLink().run()}>
          <Unlink className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* image */}
        <ToolbarButton title="Insert image" onMouseDown={() => insertImage()}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* undo/redo */}
        <ToolbarButton title="Undo" disabled={!editor.can().chain().focus().undo().run()} onMouseDown={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton title="Redo" disabled={!editor.can().chain().focus().redo().run()} onMouseDown={() => editor.chain().focus().redo().run()}>
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="tiptap font-raleway max-w-none px-5 py-4 focus:outline-none" />
    </div>
  );
}
