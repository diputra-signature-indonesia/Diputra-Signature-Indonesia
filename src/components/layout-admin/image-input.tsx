'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { uploadCoverImage, deleteImage } from '@/lib/uploadImage';

type Uploaded = { publicUrl: string; path: string };

type Props = {
  label?: string;
  name?: string; // buat <input name="..."> kalau nanti mau submit form
  defaultUrl?: string | null; // kalau edit page dan sudah ada gambar
  defaultPath?: string | null;
  onUploadedChange?: (uploaded: Uploaded | null) => void; // <-- NEW
};

export default function ImageInputWithPreview({ label = 'Featured Image', name = 'featured_image', defaultPath = null, defaultUrl = null, onUploadedChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultUrl);

  useEffect(() => {
    setPreviewUrl(defaultUrl ?? null);
    if (defaultUrl && defaultPath) {
      setUploaded({ publicUrl: defaultUrl, path: defaultPath });
    } else {
      setUploaded(null);
    }
  }, [defaultUrl, defaultPath]);

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

  async function removeFile() {
    if (uploaded?.path) {
      try {
        await deleteImage(uploaded.path);
      } catch (e) {
        console.error('Failed to delete cover image', e);
      }
    }

    setUploaded(null);
    setPreviewUrl(null);
    onUploadedChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
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
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading} className="bg-brand-burgundy rounded-md px-4 py-2 text-sm font-semibold text-white">
            {isUploading ? 'Uploading...' : uploaded ? 'Replace Image' : 'Choose Image'}
          </button>

          <button
            type="button"
            onClick={removeFile}
            disabled={!previewUrl || isUploading}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>

          {uploaded?.publicUrl ? <p className="text-sm text-gray-600">Uploaded ✓</p> : null}
        </div>
      </div>
    </div>
  );
}
