'use client';

import { deleteImage, uploadCoverImage } from '@/lib/uploadImage';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type Uploaded = { publicUrl: string; path: string | null };

type Props = {
  label?: string;
  name?: string; // buat <input name="..."> kalau nanti mau submit form
  initialUploaded?: Uploaded | null; // kalau edit page dan sudah ada gambar
  defaultUrl?: string | null; // kalau edit page dan sudah ada gambar
  defaultPath?: string | null;
  onUploadedChange?: (uploaded: Uploaded | null) => void; // <-- NEW
  onRemoveInitial?: () => void;
};

export default function ImageInputWithPreview({
  label = 'Featured Image',
  name = 'featured_image',
  initialUploaded = null,
  defaultPath = null,
  defaultUrl = null,
  onUploadedChange,
  onRemoveInitial,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultUrl);

  useEffect(() => {
    if (defaultUrl) {
      setPreviewUrl(defaultUrl);
    } else {
      setPreviewUrl(initialUploaded?.publicUrl ?? null);
    }

    if (defaultUrl && defaultPath) {
      setUploaded({ publicUrl: defaultUrl, path: defaultPath });
    } else {
      setUploaded(null);
    }
  }, [initialUploaded?.publicUrl, initialUploaded?.path, defaultUrl, defaultPath]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadCoverImage(file);

      if (uploaded?.path) {
        try {
          await deleteImage(uploaded.path);
        } catch (err) {
          // kalau delete gagal, jangan gagalkan upload baru (biar UX enak)
          console.error('Failed deleting old cover:', err);
        }
      }
      setUploaded(res);
      setPreviewUrl(res.publicUrl);
      onUploadedChange?.(res);
    } catch (err) {
      console.error('Cover upload failed:', err);
      alert('Upload cover failed. Check storage policy / login status.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleChooseClick() {
    const hasAnyCover = !!previewUrl;
    // confirm sebelum buka file picker
    if (hasAnyCover) {
      const ok = confirm('Replace will permanently remove the current draft cover (if any). The original cover will only be removed after you click Update. Continue?');
      if (!ok) return;
    }

    // reset supaya kalau pilih file yg sama, onChange tetap kepanggil
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  }

  async function removeFile() {
    if (!previewUrl) return;

    if (uploaded?.path) {
      const confirmDelete = confirm('Remove will permanently delete the NEW uploaded cover (draft) from storage. Continue?');
      if (!confirmDelete) return;

      try {
        await deleteImage(uploaded.path);
      } catch (e) {
        console.error('Failed to delete cover image', e);
      }

      setUploaded(null);
      setPreviewUrl(initialUploaded?.publicUrl ?? null);
      onUploadedChange?.(initialUploaded ?? null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const ok = confirm('Remove will mark the ORIGINAL cover for deletion. It will be deleted only after you click Update. Continue?');
    if (!ok) return;

    setPreviewUrl(null);
    setUploaded(null);
    onUploadedChange?.(null);
    onRemoveInitial?.(); // ini yang bikin featuredImage di parent jadi null
    if (inputRef.current) inputRef.current.value = '';
  }

  async function downloadImage() {
    if (!previewUrl) return;

    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      const filenameFromPath = uploaded?.path?.split('/').pop() ?? initialUploaded?.path?.split('/').pop() ?? 'cover-image';

      a.href = url;
      a.download = filenameFromPath;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download image');
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-gray-300">
      <div className="bg-gray-200 px-5 py-4">
        <h2 className="font-semibold">{label}</h2>
        <p className="mt-1 text-sm text-gray-600">PNG/JPG/WebP, disarankan rasio 16:10 atau 1200×750.</p>
      </div>

      <div className="px-5 pb-5">
        {/* Preview */}
        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-md bg-gray-100">
          {previewUrl ? (
            <Image src={previewUrl} alt="Preview" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">No image selected</div>
          )}
        </div>

        {/* Hidden file input */}
        <input ref={inputRef} name={name} type="file" accept="image/*" onChange={onPickFile} className="hidden" />

        {/* Actions */}
        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex gap-2.5">
            <button type="button" onClick={handleChooseClick} disabled={isUploading} className="bg-brand-burgundy rounded-md px-4 py-2 text-sm font-semibold text-white">
              {isUploading ? 'Uploading...' : previewUrl ? 'Replace Image' : 'Choose Image'}
            </button>
            <button
              type="button"
              onClick={removeFile}
              disabled={!previewUrl || isUploading}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
            </button>
            {uploaded?.publicUrl ? <p className="my-auto text-sm text-gray-600">Uploaded ✓</p> : null}
          </div>
          <div className="my-auto">
            {previewUrl && (
              <button type="button" onClick={downloadImage} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-50">
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
