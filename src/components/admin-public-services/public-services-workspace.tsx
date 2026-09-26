'use client';

import {
  deletePublicServiceAction,
  savePublicServiceCategoryAction,
  savePublicServiceDetailAction,
  savePublicServiceItemAction,
  type SavePublicServiceCategoryInput,
  type SavePublicServiceDetailInput,
  type SavePublicServiceItemInput,
} from '@/app/admin/public-services/actions';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import { AdminPendingOverlay } from '@/components/layout-admin/admin-route-loading';
import { PUBLIC_SERVICE_IMAGE_ACCEPT, PUBLIC_SERVICE_SVG_ACCEPT } from '@/lib/public-service-storage';
import type { AdminPublicServiceCategory, AdminPublicServiceDetail, AdminPublicServiceItem } from '@/lib/supabase/queries/public-service-management';
import { deletePublicServiceAssetUrl, uploadPublicServiceImage, uploadPublicServiceSvg } from '@/lib/upload-public-service-asset';
import { Eye, EyeOff, FileStack, ImagePlus, Pencil, Plus, Shapes, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type FormEvent } from 'react';

type Notice = { tone: 'success' | 'error'; message: string };
type CategoryEditor = { mode: 'add' | 'edit'; category?: AdminPublicServiceCategory };
type ItemEditor = { mode: 'add' | 'edit'; item?: AdminPublicServiceItem };
type DetailEditor = { mode: 'add' | 'edit'; detail?: AdminPublicServiceDetail };

const inputClass =
  'h-10 w-full rounded-lg border border-[#D6DAE0] bg-white px-3 text-sm text-[#303846] outline-none transition placeholder:text-[#A0A8B4] focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10 disabled:cursor-not-allowed disabled:bg-[#F1F3F5]';
const textareaClass = `${inputClass} h-auto resize-none py-2.5 leading-5`;
const labelClass = 'mb-1.5 block text-xs font-semibold text-[#303846]';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function text(value: string | null | undefined) {
  return value ?? '';
}

function PublishedBadge({ published }: { published: boolean | null }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${published ? 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]' : 'border-[#D9DDE3] bg-[#F5F6F8] text-[#667181]'}`}
    >
      {published ? <Eye aria-hidden="true" className="size-3" /> : <EyeOff aria-hidden="true" className="size-3" />}
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

function Required() {
  return <span className="text-[#C32929]">*</span>;
}

function AssetField({
  label,
  accept,
  currentUrl,
  file,
  required,
  help,
  onFile,
  onRemove,
}: {
  label: string;
  accept: string;
  currentUrl: string;
  file: File | null;
  required?: boolean;
  help: string;
  onFile: (file: File | null) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <span className={labelClass}>
        {label} {required ? <Required /> : null}
      </span>
      <div className="rounded-lg border border-dashed border-[#C8CDD5] bg-[#FAFBFC] p-3">
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#D9DDE3] bg-white px-3 text-xs font-semibold text-[#586273] transition hover:border-[#C4C9D0] hover:bg-[#F8F9FA]">
          <Upload aria-hidden="true" className="size-4" />
          Choose File
          <input type="file" accept={accept} className="sr-only" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
        </label>
        {file ? (
          <p className="mt-2 truncate text-xs font-medium text-[#303846]">New: {file.name}</p>
        ) : currentUrl ? (
          <a href={currentUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs font-medium text-[#8C1010] underline">
            View current asset
          </a>
        ) : (
          <p className="mt-2 text-xs text-[#8A94A3]">No file selected.</p>
        )}
        {file || currentUrl ? (
          <button type="button" onClick={onRemove} className="mt-2 text-[11px] font-semibold text-[#B42318] hover:underline">
            Remove
          </button>
        ) : null}
        <p className="mt-2 text-[10px] leading-4 text-[#8A94A3]">{help}</p>
      </div>
    </div>
  );
}

function CategoryFormModal({
  editor,
  isSaving,
  nextOrder,
  onClose,
  onSave,
}: {
  editor: CategoryEditor;
  isSaving: boolean;
  nextOrder: number;
  onClose: () => void;
  onSave: (input: SavePublicServiceCategoryInput, assets: { cardFile: File | null; heroFile: File | null; previousCard: string; previousHero: string }) => void;
}) {
  const category = editor.category;
  const [title, setTitle] = useState(text(category?.title));
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(editor.mode === 'edit');
  const [type, setType] = useState<'primary' | 'secondary'>(category?.type ?? 'primary');
  const [shortDescription, setShortDescription] = useState(text(category?.short_description));
  const [description, setDescription] = useState(text(category?.description));
  const [heroHeading, setHeroHeading] = useState(text(category?.hero_heading));
  const [cardIconKey, setCardIconKey] = useState(text(category?.card_icon_key) || 'law');
  const [seoTitle, setSeoTitle] = useState(text(category?.seo_title));
  const [seoDescription, setSeoDescription] = useState(text(category?.seo_description));
  const [ogImage, setOgImage] = useState(text(category?.og_image));
  const [sortOrder, setSortOrder] = useState(Number(category?.sort_order ?? nextOrder));
  const [isPublished, setIsPublished] = useState(Boolean(category?.is_published));
  const [cardImage, setCardImage] = useState(text(category?.card_image));
  const [heroImage, setHeroImage] = useState(text(category?.hero_image));
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!cardFile && !cardImage) return;
    onSave(
      {
        id: category?.id,
        expectedVersion: category?.version,
        title,
        slug,
        type,
        shortDescription,
        description,
        heroHeading,
        heroImage,
        cardImage,
        cardIconKey,
        seoTitle,
        seoDescription,
        ogImage,
        sortOrder,
        isPublished,
      },
      { cardFile, heroFile, previousCard: text(category?.card_image), previousHero: text(category?.hero_image) }
    );
  };

  return (
    <AdminModal
      open
      onClose={isSaving ? () => undefined : onClose}
      title={`${editor.mode === 'add' ? 'Add' : 'Edit'} Service`}
      description="Configure a top-level Service displayed on the client website."
      size="xl"
      footer={
        <>
          <button type="button" disabled={isSaving} onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
            Cancel
          </button>
          <button
            type="submit"
            form="public-service-category-form"
            disabled={isSaving || !title.trim() || !slug.trim() || (!cardFile && !cardImage)}
            className="h-9 rounded-lg bg-[#9F1010] px-5 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]"
          >
            {isSaving ? 'Saving...' : 'Save Service'}
          </button>
        </>
      }
    >
      <form id="public-service-category-form" onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="service-title">
            Service Name <Required />
          </label>
          <input
            id="service-title"
            required
            maxLength={160}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="service-slug">
            Slug <Required />
          </label>
          <input
            id="service-slug"
            required
            maxLength={100}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="service-type">
            Section Type <Required />
          </label>
          <select id="service-type" value={type} onChange={(event) => setType(event.target.value as 'primary' | 'secondary')} className={inputClass}>
            <option value="primary">Primary Service</option>
            <option value="secondary">Additional Service</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="service-order">
            Display Order
          </label>
          <input id="service-order" type="number" min={0} step={1} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} className={inputClass} />
        </div>
        <div className="lg:col-span-2">
          <label className={labelClass} htmlFor="service-short">
            Short Description
          </label>
          <textarea id="service-short" rows={2} maxLength={500} value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} className={textareaClass} />
        </div>
        <div className="lg:col-span-2">
          <label className={labelClass} htmlFor="service-description">
            Page Description
          </label>
          <textarea id="service-description" rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className={textareaClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="service-heading">
            Hero Heading
          </label>
          <input id="service-heading" maxLength={200} value={heroHeading} onChange={(event) => setHeroHeading(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="service-icon-key">
            Card Icon
          </label>
          <select id="service-icon-key" value={cardIconKey} onChange={(event) => setCardIconKey(event.target.value)} className={inputClass}>
            <option value="law">Legal</option>
            <option value="visa">Visa</option>
            <option value="realestate">Real Estate</option>
          </select>
        </div>
        <AssetField
          label="Card Photo"
          required
          accept={PUBLIC_SERVICE_IMAGE_ACCEPT}
          currentUrl={cardImage}
          file={cardFile}
          onFile={setCardFile}
          onRemove={() => {
            setCardFile(null);
            setCardImage('');
          }}
          help="Required. JPEG, PNG, or WebP; maximum 5 MiB."
        />
        <AssetField
          label="Hero Photo"
          accept={PUBLIC_SERVICE_IMAGE_ACCEPT}
          currentUrl={heroImage}
          file={heroFile}
          onFile={setHeroFile}
          onRemove={() => {
            setHeroFile(null);
            setHeroImage('');
          }}
          help="Optional. JPEG, PNG, or WebP; maximum 5 MiB."
        />
        <div>
          <label className={labelClass} htmlFor="service-seo-title">
            SEO Title
          </label>
          <input id="service-seo-title" maxLength={200} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="service-og">
            OG Image URL
          </label>
          <input id="service-og" type="url" maxLength={2048} value={ogImage} onChange={(event) => setOgImage(event.target.value)} className={inputClass} />
        </div>
        <div className="lg:col-span-2">
          <label className={labelClass} htmlFor="service-seo-description">
            SEO Description
          </label>
          <textarea id="service-seo-description" rows={2} maxLength={500} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} className={textareaClass} />
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-[#E1E4E8] bg-[#FAFBFC] p-3.5 lg:col-span-2">
          <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} className="mt-0.5 size-4 accent-[#8C1010]" />
          <span>
            <span className="block text-xs font-semibold text-[#303846]">Published</span>
            <span className="mt-1 block text-[10px] text-[#7B8491]">Show this Service on the client website.</span>
          </span>
        </label>
      </form>
    </AdminModal>
  );
}

function ItemFormModal({
  editor,
  category,
  isSaving,
  nextOrder,
  onClose,
  onSave,
}: {
  editor: ItemEditor;
  category: AdminPublicServiceCategory;
  isSaving: boolean;
  nextOrder: number;
  onClose: () => void;
  onSave: (input: SavePublicServiceItemInput, assets: { iconFile: File | null; previousIcon: string }) => void;
}) {
  const item = editor.item;
  const [title, setTitle] = useState(text(item?.title));
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(editor.mode === 'edit');
  const [description, setDescription] = useState(text(item?.description));
  const [iconKey, setIconKey] = useState(text(item?.icon_key));
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [ctaLabel, setCtaLabel] = useState(text(item?.cta_label) || 'Learn More');
  const [ctaType, setCtaType] = useState<'contact' | 'detail'>(item?.cta_type ?? 'detail');
  const [seoTitle, setSeoTitle] = useState(text(item?.seo_title));
  const [seoDescription, setSeoDescription] = useState(text(item?.seo_description));
  const [ogImage, setOgImage] = useState(text(item?.og_image));
  const [sortOrder, setSortOrder] = useState(Number(item?.sort_order ?? nextOrder));
  const [isPublished, setIsPublished] = useState(Boolean(item?.is_published));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!iconFile && !iconKey) return;
    onSave(
      { id: item?.id, expectedVersion: item?.version, categoryId: category.id, title, slug, description, iconKey, ctaLabel, ctaType, seoTitle, seoDescription, ogImage, sortOrder, isPublished },
      { iconFile, previousIcon: text(item?.icon_key) }
    );
  };

  return (
    <AdminModal
      open
      onClose={isSaving ? () => undefined : onClose}
      title={`${editor.mode === 'add' ? 'Add' : 'Edit'} Sub-service`}
      description={`Configure a Sub-service inside ${category.title ?? category.slug}.`}
      size="lg"
      footer={
        <>
          <button type="button" disabled={isSaving} onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
            Cancel
          </button>
          <button
            type="submit"
            form="public-service-item-form"
            disabled={isSaving || !title.trim() || !slug.trim() || (!iconFile && !iconKey)}
            className="h-9 rounded-lg bg-[#9F1010] px-5 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]"
          >
            {isSaving ? 'Saving...' : 'Save Sub-service'}
          </button>
        </>
      }
    >
      <form id="public-service-item-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="item-title">
            Sub-service Name <Required />
          </label>
          <input
            id="item-title"
            required
            maxLength={160}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-slug">
            Slug <Required />
          </label>
          <input
            id="item-slug"
            required
            maxLength={100}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="item-description">
            Description
          </label>
          <textarea id="item-description" rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className={textareaClass} />
        </div>
        <div className="sm:col-span-2">
          <AssetField
            label="SVG Icon"
            required
            accept={PUBLIC_SERVICE_SVG_ACCEPT}
            currentUrl={iconKey.startsWith('http') ? iconKey : ''}
            file={iconFile}
            onFile={setIconFile}
            onRemove={() => {
              setIconFile(null);
              setIconKey('');
            }}
            help={
              iconKey && !iconKey.startsWith('http')
                ? `Legacy icon: ${iconKey}. Upload an SVG to replace it.`
                : 'Required for new Sub-services. SVG only; maximum 512 KiB. Unsafe scripts and external references are rejected.'
            }
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-cta-label">
            CTA Label
          </label>
          <input id="item-cta-label" maxLength={80} value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-cta-type">
            CTA Destination
          </label>
          <select id="item-cta-type" value={ctaType} onChange={(event) => setCtaType(event.target.value as 'contact' | 'detail')} className={inputClass}>
            <option value="detail">Detail Page</option>
            <option value="contact">Contact Page</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="item-order">
            Display Order
          </label>
          <input id="item-order" type="number" min={0} step={1} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-og">
            OG Image URL
          </label>
          <input id="item-og" type="url" maxLength={2048} value={ogImage} onChange={(event) => setOgImage(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-seo-title">
            SEO Title
          </label>
          <input id="item-seo-title" maxLength={200} value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="item-seo-description">
            SEO Description
          </label>
          <input id="item-seo-description" maxLength={500} value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} className={inputClass} />
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-[#E1E4E8] bg-[#FAFBFC] p-3.5 sm:col-span-2">
          <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} className="mt-0.5 size-4 accent-[#8C1010]" />
          <span>
            <span className="block text-xs font-semibold text-[#303846]">Published</span>
            <span className="mt-1 block text-[10px] text-[#7B8491]">Show this Sub-service on the selected Service page.</span>
          </span>
        </label>
      </form>
    </AdminModal>
  );
}

function DetailFormModal({
  editor,
  item,
  isSaving,
  nextOrder,
  onClose,
  onSave,
}: {
  editor: DetailEditor;
  item: AdminPublicServiceItem;
  isSaving: boolean;
  nextOrder: number;
  onClose: () => void;
  onSave: (input: SavePublicServiceDetailInput) => void;
}) {
  const detail = editor.detail;
  const [title, setTitle] = useState(text(detail?.title));
  const [description, setDescription] = useState(text(detail?.description));
  const [ctaDescription, setCtaDescription] = useState(text(detail?.cta_description) || 'Contact Us');
  const [sortOrder, setSortOrder] = useState(Number(detail?.sort_order ?? nextOrder));
  const [isPublished, setIsPublished] = useState(Boolean(detail?.is_published));
  return (
    <AdminModal
      open
      onClose={isSaving ? () => undefined : onClose}
      title={`${editor.mode === 'add' ? 'Add' : 'Edit'} Service Detail`}
      description={`Optional detail shown inside ${item.title ?? item.slug}.`}
      size="md"
      footer={
        <>
          <button type="button" disabled={isSaving} onClick={onClose} className="h-9 rounded-lg px-4 text-xs font-semibold text-[#586273] hover:bg-[#F0F2F4]">
            Cancel
          </button>
          <button
            type="submit"
            form="public-service-detail-form"
            disabled={isSaving || !title.trim()}
            className="h-9 rounded-lg bg-[#9F1010] px-5 text-xs font-semibold text-white hover:bg-[#7E0C0C] disabled:cursor-not-allowed disabled:bg-[#C9CDD3]"
          >
            {isSaving ? 'Saving...' : 'Save Detail'}
          </button>
        </>
      }
    >
      <form
        id="public-service-detail-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ id: detail?.id, expectedVersion: detail?.version, serviceItemId: item.id, title, description, ctaDescription, sortOrder, isPublished });
        }}
        className="space-y-4"
      >
        <div>
          <label className={labelClass} htmlFor="detail-title">
            Detail Name <Required />
          </label>
          <input id="detail-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="detail-description">
            Description
          </label>
          <textarea id="detail-description" rows={5} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className={textareaClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="detail-cta">
            CTA Label
          </label>
          <input id="detail-cta" maxLength={120} value={ctaDescription} onChange={(event) => setCtaDescription(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="detail-order">
            Display Order
          </label>
          <input id="detail-order" type="number" min={0} step={1} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} className={inputClass} />
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-[#E1E4E8] bg-[#FAFBFC] p-3.5">
          <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} className="mt-0.5 size-4 accent-[#8C1010]" />
          <span>
            <span className="block text-xs font-semibold text-[#303846]">Published</span>
            <span className="mt-1 block text-[10px] text-[#7B8491]">Show this detail on the public Sub-service page.</span>
          </span>
        </label>
      </form>
    </AdminModal>
  );
}

export function PublicServicesWorkspace({ initialCategories }: { initialCategories: AdminPublicServiceCategory[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(initialCategories[0]?.id ?? '');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditor | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemEditor | null>(null);
  const [detailItem, setDetailItem] = useState<AdminPublicServiceItem | null>(null);
  const [detailEditor, setDetailEditor] = useState<DetailEditor | null>(null);

  const selected = initialCategories.find((category) => category.id === selectedId) ?? initialCategories[0] ?? null;
  const nextCategoryOrder = Math.max(-10, ...initialCategories.map((category) => Number(category.sort_order ?? 0))) + 10;
  const nextItemOrder = selected ? Math.max(-10, ...selected.items.map((item) => Number(item.sort_order ?? 0))) + 10 : 0;
  const nextDetailOrder = detailItem ? Math.max(-10, ...detailItem.details.map((detail) => Number(detail.sort_order ?? 0))) + 10 : 0;

  const detailItemFresh = useMemo(() => selected?.items.find((item) => item.id === detailItem?.id) ?? detailItem, [selected, detailItem]);

  const finish = (result: { ok: boolean; message: string }, close: () => void) => {
    setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
    if (result.ok) {
      close();
      router.refresh();
    }
  };

  const saveCategory = (input: SavePublicServiceCategoryInput, assets: { cardFile: File | null; heroFile: File | null; previousCard: string; previousHero: string }) => {
    startTransition(async () => {
      const uploaded: string[] = [];
      try {
        if (assets.cardFile) {
          const value = await uploadPublicServiceImage(assets.cardFile);
          input.cardImage = value.publicUrl;
          uploaded.push(value.publicUrl);
        }
        if (assets.heroFile) {
          const value = await uploadPublicServiceImage(assets.heroFile);
          input.heroImage = value.publicUrl;
          uploaded.push(value.publicUrl);
        }
        const result = await savePublicServiceCategoryAction(input);
        if (!result.ok) {
          await Promise.all(uploaded.map((url) => deletePublicServiceAssetUrl(url).catch(() => undefined)));
        } else {
          if (assets.previousCard && assets.previousCard !== input.cardImage) await deletePublicServiceAssetUrl(assets.previousCard).catch(() => undefined);
          if (assets.previousHero && assets.previousHero !== input.heroImage) await deletePublicServiceAssetUrl(assets.previousHero).catch(() => undefined);
        }
        finish(result, () => setCategoryEditor(null));
      } catch (error) {
        await Promise.all(uploaded.map((url) => deletePublicServiceAssetUrl(url).catch(() => undefined)));
        setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Asset Service gagal diunggah.' });
      }
    });
  };

  const saveItem = (input: SavePublicServiceItemInput, assets: { iconFile: File | null; previousIcon: string }) => {
    startTransition(async () => {
      let uploadedUrl = '';
      try {
        if (assets.iconFile) {
          const value = await uploadPublicServiceSvg(assets.iconFile);
          input.iconKey = value.publicUrl;
          uploadedUrl = value.publicUrl;
        }
        const result = await savePublicServiceItemAction(input);
        if (!result.ok && uploadedUrl) await deletePublicServiceAssetUrl(uploadedUrl).catch(() => undefined);
        if (result.ok && uploadedUrl && assets.previousIcon !== uploadedUrl) await deletePublicServiceAssetUrl(assets.previousIcon).catch(() => undefined);
        finish(result, () => setItemEditor(null));
      } catch (error) {
        if (uploadedUrl) await deletePublicServiceAssetUrl(uploadedUrl).catch(() => undefined);
        setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Icon SVG gagal diunggah.' });
      }
    });
  };

  const saveDetail = (input: SavePublicServiceDetailInput) => {
    startTransition(async () => {
      const result = await savePublicServiceDetailAction(input);
      finish(result, () => setDetailEditor(null));
    });
  };

  const remove = (kind: 'category' | 'item' | 'detail', record: AdminPublicServiceCategory | AdminPublicServiceItem | AdminPublicServiceDetail) => {
    const label = kind === 'category' ? 'Service beserta seluruh Sub-service dan detailnya' : kind === 'item' ? 'Sub-service beserta seluruh detailnya' : 'detail ini';
    if (!window.confirm(`Hapus ${label}? Data akan disembunyikan dari client page dan tetap dipertahankan sebagai histori.`)) return;
    startTransition(async () => {
      const result = await deletePublicServiceAction(kind, record.id, record.version);
      if (result.ok) {
        if (kind === 'category') {
          const category = record as AdminPublicServiceCategory;
          const urls = [category.card_image, category.hero_image, ...category.items.map((item) => item.icon_key)];
          await Promise.all(urls.map((url) => deletePublicServiceAssetUrl(url).catch(() => undefined)));
          setSelectedId(initialCategories.find((value) => value.id !== category.id)?.id ?? '');
        } else if (kind === 'item') {
          await deletePublicServiceAssetUrl((record as AdminPublicServiceItem).icon_key).catch(() => undefined);
          if (detailItem?.id === record.id) setDetailItem(null);
        } else if (detailItem) {
          setDetailItem({ ...detailItem, details: detailItem.details.filter((detail) => detail.id !== record.id) });
        }
        router.refresh();
      }
      setNotice({ tone: result.ok ? 'success' : 'error', message: result.message });
    });
  };

  return (
    <main className="p-4 pb-20 sm:p-5 lg:p-6" aria-busy={isPending}>
      {notice ? (
        <div
          role="status"
          className={`mb-4 rounded-lg border px-4 py-3 text-xs font-medium ${notice.tone === 'success' ? 'border-[#A7E2BE] bg-[#EDFBF3] text-[#147A46]' : 'border-[#F3B9B9] bg-[#FFF0F0] text-[#A51919]'}`}
        >
          {notice.message}
        </div>
      ) : null}
      <section className="grid min-h-[650px] overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#DEE2E7] bg-[#FBFCFD] lg:border-r lg:border-b-0">
          <div className="flex items-start justify-between gap-3 px-4 pt-5 pb-3 lg:px-5 lg:pt-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9AA4B4] uppercase">Select Service</p>
              <p className="mt-1 text-xs leading-5 text-[#707988]">Choose client-page content.</p>
            </div>
            <button
              type="button"
              onClick={() => setCategoryEditor({ mode: 'add' })}
              disabled={isPending}
              aria-label="Add Service"
              title="Add Service"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#9F1010] text-white hover:bg-[#7E0C0C] disabled:opacity-50"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <nav aria-label="Client Services" className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:gap-1 lg:px-3 lg:pb-6">
            {initialCategories.map((category) => {
              const active = category.id === selected?.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(category.id);
                    setNotice(null);
                  }}
                  className={`group flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-left transition lg:w-full lg:min-w-0 ${active ? 'bg-[#FDEBEB] text-[#8C1010]' : 'text-[#394150] hover:bg-white hover:text-[#8C1010]'}`}
                >
                  <Shapes className="size-[18px] shrink-0" strokeWidth={1.7} />
                  <span className="min-w-0 flex-1 text-xs font-semibold lg:truncate">{category.title ?? category.slug}</span>
                  <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${active ? 'bg-white text-[#8C1010]' : 'bg-[#F1F3F5] text-[#7A8492]'}`}>
                    {category.items.length}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 bg-white">
          {selected ? (
            <>
              <header className="flex flex-col gap-4 border-b border-[#E4E7EB] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-xl font-semibold tracking-tight text-[#202938]">{selected.title ?? selected.slug}</h2>
                    <PublishedBadge published={selected.is_published} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#707988]">Manage Sub-services and optional nested details.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryEditor({ mode: 'edit', category: selected })}
                    disabled={isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D9DDE3] px-3.5 text-xs font-semibold text-[#586273] hover:bg-[#F8F9FA]"
                  >
                    <Pencil className="size-4" />
                    Edit Service
                  </button>
                  <button
                    type="button"
                    onClick={() => remove('category', selected)}
                    disabled={isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E1BEBE] px-3.5 text-xs font-semibold text-[#A51919] hover:bg-[#FFF7F7]"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemEditor({ mode: 'add' })}
                    disabled={isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white hover:bg-[#7E0C0C]"
                  >
                    <Plus className="size-4" />
                    Add Sub-service
                  </button>
                </div>
              </header>
              <div className="overflow-x-auto p-4 sm:p-6">
                <table className="w-full min-w-[900px] border-collapse overflow-hidden rounded-lg border border-[#E1E4E8] text-left">
                  <thead className="bg-[#F8F9FA] text-[10px] font-semibold tracking-[0.05em] text-[#737B87] uppercase">
                    <tr>
                      <th className="px-4 py-3">Sub-service</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">CTA</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E9ED]">
                    {selected.items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FCFCFD]">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {item.icon_key?.startsWith('http') ? (
                              <Image src={item.icon_key} alt="" width={36} height={36} unoptimized className="size-9 rounded-md border border-[#E1E4E8] bg-white object-contain p-1.5" />
                            ) : (
                              <div className="flex size-9 items-center justify-center rounded-md bg-[#FDEBEB] text-[#8C1010]">
                                <Shapes className="size-4" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-[#202938]">{item.title ?? item.slug}</p>
                              <p className="mt-0.5 max-w-xs truncate text-[11px] text-[#7B8491]">{item.description || 'No description'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-[#586273]">{item.slug}</td>
                        <td className="px-4 py-4 text-xs text-[#586273]">{item.cta_type === 'detail' ? 'Detail Page' : 'Contact Page'}</td>
                        <td className="px-4 py-4 text-xs font-semibold text-[#586273]">{item.details.length}</td>
                        <td className="px-4 py-4">
                          <PublishedBadge published={item.is_published} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailItem(item)}
                              title="Manage details"
                              aria-label={`Manage details for ${item.title}`}
                              className="inline-flex size-8 items-center justify-center rounded-md text-[#245293] hover:bg-[#F0F5FF]"
                            >
                              <FileStack className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemEditor({ mode: 'edit', item })}
                              title="Edit Sub-service"
                              className="inline-flex size-8 items-center justify-center rounded-md text-[#667181] hover:bg-[#F2F4F7]"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove('item', item)}
                              title="Delete Sub-service"
                              className="inline-flex size-8 items-center justify-center rounded-md text-[#A51919] hover:bg-[#FFF0F0]"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selected.items.length === 0 ? (
                  <div className="rounded-b-lg border border-t-0 border-[#E1E4E8] px-6 py-16 text-center">
                    <ImagePlus className="mx-auto size-8 text-[#A5ADB8]" />
                    <p className="mt-3 text-sm font-semibold text-[#303846]">No Sub-services yet</p>
                    <p className="mt-1 text-xs text-[#7B8491]">Add the first Sub-service for {selected.title ?? selected.slug}.</p>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex min-h-[650px] flex-col items-center justify-center px-6 text-center">
              <Shapes className="size-10 text-[#A5ADB8]" />
              <h2 className="mt-4 text-lg font-semibold">No Client Services yet</h2>
              <p className="mt-1 text-sm text-[#7B8491]">Create the first Service to begin managing public content.</p>
              <button
                type="button"
                onClick={() => setCategoryEditor({ mode: 'add' })}
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white"
              >
                <Plus className="size-4" />
                Add Service
              </button>
            </div>
          )}
        </div>
      </section>

      {categoryEditor ? (
        <CategoryFormModal
          key={`${categoryEditor.mode}-${categoryEditor.category?.id ?? 'new'}`}
          editor={categoryEditor}
          isSaving={isPending}
          nextOrder={nextCategoryOrder}
          onClose={() => setCategoryEditor(null)}
          onSave={saveCategory}
        />
      ) : null}
      {itemEditor && selected ? (
        <ItemFormModal
          key={`${itemEditor.mode}-${itemEditor.item?.id ?? 'new'}`}
          editor={itemEditor}
          category={selected}
          isSaving={isPending}
          nextOrder={nextItemOrder}
          onClose={() => setItemEditor(null)}
          onSave={saveItem}
        />
      ) : null}

      {detailItemFresh ? (
        <AdminModal
          open
          onClose={() => !isPending && setDetailItem(null)}
          title="Sub-service Details"
          description={`Optional nested content for ${detailItemFresh.title ?? detailItemFresh.slug}.`}
          size="xl"
        >
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={() => setDetailEditor({ mode: 'add' })} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white">
              <Plus className="size-4" />
              Add Detail
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#E1E4E8]">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#F8F9FA] text-[10px] font-semibold text-[#737B87] uppercase">
                <tr>
                  <th className="px-4 py-3">Detail</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E9ED]">
                {detailItemFresh.details.map((detail) => (
                  <tr key={detail.id}>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-[#202938]">{detail.title}</p>
                      <p className="mt-1 max-w-lg truncate text-[11px] text-[#7B8491]">{detail.description || 'No description'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#586273]">{detail.sort_order}</td>
                    <td className="px-4 py-3">
                      <PublishedBadge published={detail.is_published} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailEditor({ mode: 'edit', detail })}
                          className="inline-flex size-8 items-center justify-center rounded-md text-[#667181] hover:bg-[#F2F4F7]"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button type="button" onClick={() => remove('detail', detail)} className="inline-flex size-8 items-center justify-center rounded-md text-[#A51919] hover:bg-[#FFF0F0]">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detailItemFresh.details.length === 0 ? <div className="px-6 py-12 text-center text-sm text-[#7B8491]">No optional details have been added.</div> : null}
          </div>
        </AdminModal>
      ) : null}
      {detailEditor && detailItemFresh ? (
        <DetailFormModal
          key={`${detailEditor.mode}-${detailEditor.detail?.id ?? 'new'}`}
          editor={detailEditor}
          item={detailItemFresh}
          isSaving={isPending}
          nextOrder={nextDetailOrder}
          onClose={() => setDetailEditor(null)}
          onSave={saveDetail}
        />
      ) : null}
      {isPending ? <AdminPendingOverlay label="Saving Client Services..." /> : null}
    </main>
  );
}
