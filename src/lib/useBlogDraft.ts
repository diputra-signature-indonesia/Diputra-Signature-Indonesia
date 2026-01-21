'use client';

import { useEffect } from 'react';

// path === null → initial cover from DB (delete on Update only)
// path !== null → draft uploaded image (can be deleted immediately)
type FeaturedImage = { publicUrl: string; path: string | null } | null;

export type BlogDraft = {
  title: string;
  excerpt: string;
  slug: string;
  contentHtml: string;
  uploadedPaths: string[];
  featuredImage: FeaturedImage;
};

const DEFAULT_DRAFT: BlogDraft = {
  title: '',
  excerpt: '',
  slug: '',
  contentHtml: '',
  uploadedPaths: [],
  featuredImage: null,
};

export function loadBlogDraft(storageKey: string): BlogDraft {
  if (typeof window === 'undefined') return DEFAULT_DRAFT;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_DRAFT;

    const parsed = JSON.parse(raw) as Partial<BlogDraft>;

    const featured =
      parsed.featuredImage && typeof parsed.featuredImage === 'object'
        ? {
            publicUrl: typeof parsed.featuredImage.publicUrl === 'string' ? parsed.featuredImage.publicUrl : '',
            path: typeof parsed.featuredImage.path === 'string' ? parsed.featuredImage.path : null,
          }
        : null;

    return {
      ...DEFAULT_DRAFT,
      ...parsed,
      uploadedPaths: Array.isArray(parsed.uploadedPaths) ? parsed.uploadedPaths : [],
      featuredImage: featured?.publicUrl ? featured : null,
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

export function saveBlogDraft(storageKey: string, draft: BlogDraft) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, JSON.stringify(draft));
}

export function clearBlogDraft(storageKey: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey);
}

/**
 * Autosave draft to localStorage (debounced by a simple timeout)
 */
export function useAutosaveBlogDraft(storageKey: string, draft: BlogDraft) {
  const delayMs = 500;
  useEffect(() => {
    const t = window.setTimeout(() => {
      saveBlogDraft(storageKey, draft);
    }, delayMs);

    return () => window.clearTimeout(t);
  }, [storageKey, draft.title, draft.excerpt, draft.slug, draft.contentHtml, draft.featuredImage?.publicUrl, draft.featuredImage?.path, draft.uploadedPaths.join('|')]);
}
