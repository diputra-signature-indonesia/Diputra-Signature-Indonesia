import type { ReactNode } from 'react';

type PublicRouteLoadingVariant = 'home' | 'about' | 'list' | 'category' | 'article' | 'detail';

type PublicRouteLoadingProps = {
  variant: PublicRouteLoadingVariant;
};

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`bg-brand-black/10 ${className}`} />;
}

function HomeLoading() {
  return (
    <div className="brand-section-px mx-auto grid min-h-[85svh] max-w-[1440px] items-center gap-10 py-12 md:grid-cols-2 md:gap-16">
      <div className="space-y-5">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <div className="space-y-3">
          <SkeletonBlock className="h-10 w-full max-w-xl rounded-lg sm:h-12" />
          <SkeletonBlock className="h-10 w-4/5 max-w-md rounded-lg sm:h-12" />
        </div>
        <div className="space-y-2 pt-2">
          <SkeletonBlock className="h-4 w-full max-w-lg rounded-full" />
          <SkeletonBlock className="h-4 w-5/6 max-w-md rounded-full" />
        </div>
        <SkeletonBlock className="mt-8 h-11 w-36 rounded-md" />
      </div>
      <SkeletonBlock className="aspect-[4/5] w-full max-w-xl justify-self-center rounded-2xl sm:aspect-square md:aspect-[4/5]" />
    </div>
  );
}

function AboutLoading() {
  return (
    <div className="brand-section-px mx-auto flex min-h-[calc(100svh-5rem)] max-w-[1440px] items-end py-16">
      <div className="bg-brand-black/5 w-full rounded-2xl p-6 sm:p-10 lg:p-14">
        <div className="max-w-3xl space-y-5">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <div className="space-y-3">
            <SkeletonBlock className="h-9 w-full rounded-lg sm:h-11" />
            <SkeletonBlock className="h-9 w-3/4 rounded-lg sm:h-11" />
          </div>
          <div className="space-y-2 pt-4">
            <SkeletonBlock className="h-4 w-full rounded-full" />
            <SkeletonBlock className="h-4 w-5/6 rounded-full" />
            <SkeletonBlock className="h-4 w-2/3 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ListLoading() {
  return (
    <div className="brand-section-px mx-auto min-h-[720px] max-w-[1440px] py-20 lg:py-30">
      <div className="mb-12 space-y-4">
        <SkeletonBlock className="h-9 w-52 rounded-lg sm:h-11 sm:w-72" />
        <SkeletonBlock className="h-4 w-full max-w-xl rounded-full" />
        <SkeletonBlock className="h-4 w-4/5 max-w-lg rounded-full" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-brand-black/5 overflow-hidden rounded-xl border bg-white p-4">
            <SkeletonBlock className="aspect-[16/10] w-full rounded-lg" />
            <div className="space-y-3 pt-5">
              <SkeletonBlock className="h-5 w-3/4 rounded-full" />
              <SkeletonBlock className="h-4 w-full rounded-full" />
              <SkeletonBlock className="h-4 w-2/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryLoading() {
  return (
    <div className="brand-section-px mx-auto grid min-h-[600px] max-w-[1440px] items-center gap-10 py-16 md:grid-cols-2 md:gap-16">
      <SkeletonBlock className="aspect-[4/3] w-full rounded-2xl" />
      <div className="space-y-5">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <div className="space-y-3">
          <SkeletonBlock className="h-9 w-full rounded-lg sm:h-11" />
          <SkeletonBlock className="h-9 w-3/4 rounded-lg sm:h-11" />
        </div>
        <div className="space-y-2 pt-3">
          <SkeletonBlock className="h-4 w-full rounded-full" />
          <SkeletonBlock className="h-4 w-5/6 rounded-full" />
          <SkeletonBlock className="h-4 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ArticleLoading() {
  return (
    <div className="brand-section-px mx-auto min-h-screen max-w-4xl py-20 lg:py-30">
      <SkeletonBlock className="mb-6 h-4 w-28 rounded-full" />
      <div className="space-y-3">
        <SkeletonBlock className="h-9 w-full rounded-lg sm:h-11" />
        <SkeletonBlock className="h-9 w-4/5 rounded-lg sm:h-11" />
      </div>
      <SkeletonBlock className="mt-8 aspect-[16/8] w-full rounded-xl" />
      <div className="mt-10 space-y-3">
        <SkeletonBlock className="h-4 w-full rounded-full" />
        <SkeletonBlock className="h-4 w-full rounded-full" />
        <SkeletonBlock className="h-4 w-11/12 rounded-full" />
        <SkeletonBlock className="h-4 w-4/5 rounded-full" />
      </div>
    </div>
  );
}

function DetailLoading() {
  return (
    <div className="brand-section-px mx-auto min-h-[680px] max-w-[1120px] py-20 text-center lg:py-30">
      <div className="mx-auto max-w-3xl space-y-5">
        <SkeletonBlock className="mx-auto h-4 w-32 rounded-full" />
        <div className="space-y-3">
          <SkeletonBlock className="h-9 w-full rounded-lg sm:h-11" />
          <SkeletonBlock className="mx-auto h-9 w-3/4 rounded-lg sm:h-11" />
        </div>
        <div className="space-y-2 pt-3">
          <SkeletonBlock className="h-4 w-full rounded-full" />
          <SkeletonBlock className="mx-auto h-4 w-5/6 rounded-full" />
        </div>
      </div>
      <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-brand-black/5 space-y-4 rounded-xl border bg-white p-5">
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
            <SkeletonBlock className="h-5 w-2/3 rounded-full" />
            <SkeletonBlock className="h-4 w-full rounded-full" />
            <SkeletonBlock className="h-4 w-4/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublicRouteLoading({ variant }: PublicRouteLoadingProps) {
  const loadingByVariant = {
    home: <HomeLoading />,
    about: <AboutLoading />,
    list: <ListLoading />,
    category: <CategoryLoading />,
    article: <ArticleLoading />,
    detail: <DetailLoading />,
  } satisfies Record<PublicRouteLoadingVariant, ReactNode>;

  return (
    <div role="status" aria-live="polite" aria-busy="true" className="bg-brand-white w-full">
      <span className="sr-only">Loading page</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        {loadingByVariant[variant]}
      </div>
    </div>
  );
}
