'use client';

import { saveDraftBlogAction, updateBlogPostAction } from '@/app/admin/blog/actions';
import ImageInputWithPreview from '@/components/layout-admin/image-input';
import TiptapEditor from '@/components/layout-admin/tiptap-editor';
import { slugify } from '@/lib/slugify';
import { EditableBlogPost } from '@/lib/supabase/queries';
import { cleanupUnusedImages, deleteImage, extractImageSrcs, publicUrlToPath } from '@/lib/uploadImage';
import { clearBlogDraft, loadBlogDraft, useAutosaveBlogDraft } from '@/lib/useBlogDraft';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type CreateBlogFormProps = { mode: 'create'; authorName: string } | { mode: 'edit'; initialValues: EditableBlogPost };
type Uploaded = { publicUrl: string; path: string | null };

function estimateReadingTimeFromHtml(html: string) {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text ? text.split(' ').length : 0;
  const wpm = 200; // umum: 200 kata/menit
  const minutes = Math.max(1, Math.ceil(words / wpm));
  return minutes;
}

const DRAFT_KEY = 'blog-create-draft';

export default function CreateBlogForm(props: CreateBlogFormProps) {
  const [contentHtml, setContentHtml] = useState('');
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<Uploaded | null>(null);
  const [initialCoverPath, setInitialCoverPath] = useState<Uploaded | null>(null);

  const isUsingInitial = !!featuredImage?.publicUrl && !!initialCoverPath?.publicUrl && featuredImage.publicUrl === initialCoverPath.publicUrl;

  const [authorName, setAuthorName] = useState('');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [slug, setSlug] = useState('');

  const router = useRouter();
  const isEdit = props.mode === 'edit';
  const STORAGE_KEY = isEdit ? `blog-edit-draft:${props.initialValues.id}` : DRAFT_KEY;

  useEffect(() => {
    setFeaturedImage(null);
    setUploadedPaths([]);
    // 1) load draft dulu
    const draft = loadBlogDraft(STORAGE_KEY);

    if (isEdit) {
      const blog = props.initialValues;
      const imageData = blog.featured_image ? { publicUrl: blog.featured_image, path: publicUrlToPath(blog.featured_image, 'images') ?? null } : null;
      const draftHasData = !!draft.title || !!draft.excerpt || !!draft.contentHtml || !!draft.featuredImage?.publicUrl || (draft.uploadedPaths?.length ?? 0) > 0;
      const htmlToUse = draftHasData ? draft.contentHtml || blog.content_md : blog.content_md;

      setAuthorName(blog.author_name);
      setTitle(draftHasData ? draft.title || blog.title : blog.title);
      setExcerpt(draftHasData ? draft.excerpt || blog.excerpt : blog.excerpt);
      setSlug(blog.slug);
      setContentHtml(htmlToUse);
      setUploadedPaths(draftHasData ? draft.uploadedPaths || [] : []);

      const initialPathsFromHtml = extractImageSrcs(htmlToUse)
        .map((src) => publicUrlToPath(src, 'images'))
        .filter(Boolean) as string[];
      const merged = new Set([...(draftHasData ? draft.uploadedPaths || [] : []), ...initialPathsFromHtml]);

      setUploadedPaths(Array.from(merged));

      // INI KUNCINYA:
      // featuredImage hanya draft cover (cover baru) dari localStorage
      setFeaturedImage(draftHasData ? (draft.featuredImage ?? null) : imageData);
      // initialCoverPath selalu dari DB
      setInitialCoverPath(imageData);

      return;
    }

    // CREATE: pakai draft create
    setAuthorName(props.authorName);
    setTitle(draft.title);
    setExcerpt(draft.excerpt);
    setSlug(draft.slug);
    setContentHtml(draft.contentHtml);
    setUploadedPaths(draft.uploadedPaths);
    setFeaturedImage(draft.featuredImage);
  }, [STORAGE_KEY, isEdit, props.mode]);

  useAutosaveBlogDraft(STORAGE_KEY, { title, excerpt, slug: isEdit ? props.initialValues.slug : slug, contentHtml, uploadedPaths, featuredImage });

  async function cleanupDraftImages() {
    // 1) hapus cover image draft
    if (featuredImage?.path) {
      try {
        await deleteImage(featuredImage.path);
      } catch (e) {
        console.error('Failed deleting cover draft image', e);
      }
    }

    // 2) hapus semua editor images draft
    if (uploadedPaths.length > 0) {
      try {
        await Promise.all(uploadedPaths.map((p) => deleteImage(p)));
      } catch (e) {
        console.error('Failed deleting editor draft images', e);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) return alert('Title is required');
    if (!excerpt.trim()) return alert('Excerpt is required');
    if (!isEdit && !slug.trim()) return alert('Slug is required');
    if (!contentHtml.trim()) return alert('Content is required');

    const reading_time_min = estimateReadingTimeFromHtml(contentHtml);

    let res;

    if (props.mode === 'create') {
      try {
        res = await saveDraftBlogAction({
          slug,
          title,
          excerpt,
          content_md: contentHtml,
          author_name: authorName,
          reading_time_min,
          featured_image: featuredImage?.publicUrl ?? null,
        });
      } catch (err) {
        console.error('saveDraftBlogAction: ERROR', err);
        alert('Save draft failed. Check login / RLS policy.');
        return;
      }
    }

    if (props.mode === 'edit') {
      try {
        const nextFeaturedUrl = featuredImage?.publicUrl ?? null;

        res = await updateBlogPostAction(props.initialValues.id, {
          title,
          excerpt,
          content_md: contentHtml,
          reading_time_min,
          featured_image: nextFeaturedUrl,
        });

        if (initialCoverPath?.path) {
          const userRemovedInitial = nextFeaturedUrl === null;
          const userReplaced = !!featuredImage?.publicUrl && !!initialCoverPath?.publicUrl && featuredImage.publicUrl !== initialCoverPath.publicUrl;

          if (userRemovedInitial || userReplaced) {
            await deleteImage(initialCoverPath.path);
          }
        }
      } catch (err) {
        console.error('saveUpdateBlogAction: ERROR', err);
        alert('Save update failed. Check login / RLS policy.');
        return;
      }
    }
    // 2) Baru cleanup unused images (best-effort, jangan gagalkan save)
    try {
      await cleanupUnusedImages(contentHtml, uploadedPaths);
      console.log('cleanupUnusedImages: OK');
    } catch (err) {
      console.error('cleanupUnusedImages: ERROR', err);
    }

    clearBlogDraft(STORAGE_KEY);

    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="font-raleway flex h-full w-full flex-col px-4 py-6">
      <div className="flex flex-row justify-between">
        <h1>{isEdit ? 'Edit Blog' : 'New Blog'}</h1>
        <div className="flex flex-row gap-3">
          <button
            type="button"
            onClick={async () => {
              const confirmCancel = confirm(isEdit ? 'Discard changes?' : 'Discard this draft and delete uploaded images?');
              if (!confirmCancel) return;

              if (!isEdit) {
                try {
                  await cleanupDraftImages();
                  console.log('Draft images deleted');
                } catch (e) {
                  console.error('Draft cleanup failed', e);
                }
              } else {
                const userUploadedNew = featuredImage?.path && initialCoverPath?.path && featuredImage.path !== initialCoverPath.path;
                if (userUploadedNew && featuredImage?.path) {
                  await deleteImage(featuredImage.path);
                }

                if (uploadedPaths.length) {
                  await Promise.all(uploadedPaths.map((p) => deleteImage(p)));
                }
              }
              clearBlogDraft(STORAGE_KEY);
              router.replace('/admin');
            }}
            className="rounded-md bg-gray-500 px-7 py-2 text-white"
          >
            Cancel
          </button>
          <button type="submit" className="bg-brand-burgundy rounded-md px-7 py-2 text-white">
            {isEdit ? 'Update Blog' : 'Save Draft'}
          </button>
        </div>
      </div>
      <div className="mx-auto mt-7 flex w-4xl flex-col gap-7 pb-52">
        <div className="flex flex-col rounded-sm border border-gray-300">
          <h2 className="bg-gray-200 px-5 py-4 font-semibold">Author Name</h2>
          <input type="text" className="px-5 py-4" value={authorName} readOnly />
        </div>
        <div className="flex flex-col rounded-sm border border-gray-300">
          <h2 className="bg-gray-200 px-5 py-4 font-semibold">Slug</h2>
          <input type="text" placeholder="slug generated automatically" value={slug} className="px-5 py-4" readOnly />
        </div>
        <div className="flex flex-col rounded-sm border border-gray-300">
          <ImageInputWithPreview
            initialUploaded={initialCoverPath}
            onUploadedChange={(img) => setFeaturedImage(img ?? initialCoverPath)}
            defaultPath={!isUsingInitial ? (featuredImage?.path ?? null) : null}
            defaultUrl={!isUsingInitial ? (featuredImage?.publicUrl ?? null) : null}
            onRemoveInitial={() => setFeaturedImage(null)}
          />
        </div>
        <div className="flex flex-col rounded-sm border border-gray-300">
          <h2 className="bg-gray-200 px-5 py-4 font-semibold">Title</h2>
          <input
            type="text"
            placeholder="Blog Title"
            value={title}
            onChange={(e) => {
              const value = e.target.value;
              setTitle(value);
              if (!isEdit) setSlug(slugify(value));
            }}
            className="px-5 py-4"
          />
        </div>
        <div className="flex flex-col rounded-sm border border-gray-300">
          <h2 className="bg-gray-200 px-5 py-4 font-semibold">Excerpt / Short Description</h2>
          <input type="text" placeholder="short description about this blog/article" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="px-5 py-4" />
        </div>
        <div className="flex flex-col rounded-sm border border-gray-300">
          <TiptapEditor initialContent={contentHtml} onChange={setContentHtml} onImageUploaded={(path) => setUploadedPaths((prev) => Array.from(new Set([...prev, path])))} />
        </div>
      </div>
    </form>
  );
}
