'use client';

import { masterDataCategories, type MasterDataCategoryId } from '@/data/admin-master-data/master-data-dummy-data';
import { Archive, Plus } from 'lucide-react';
import { useState } from 'react';
import { MasterDataCategoryList } from './master-data-category-list';
import { MasterDataTable } from './master-data-table';

export function MasterDataWorkspace() {
  const [selectedId, setSelectedId] = useState<MasterDataCategoryId>('priorities');
  const selectedCategory = masterDataCategories.find((category) => category.id === selectedId) ?? masterDataCategories[0];

  const selectCategory = (categoryId: MasterDataCategoryId) => {
    setSelectedId(categoryId);
  };

  return (
    <main className="p-4 pb-20 sm:p-5 lg:p-6">
      <section className="grid min-h-[650px] overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <MasterDataCategoryList categories={masterDataCategories} selectedId={selectedCategory.id} onSelect={selectCategory} />

        <div className="min-w-0 bg-white">
          <header className="flex flex-col gap-4 border-b border-[#E4E7EB] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-[#202938]">{selectedCategory.label}</h2>
              <p className="mt-1 text-xs leading-5 text-[#707988]">{selectedCategory.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedCategory.id === 'workflow-templates' ? (
                <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D9DDE3] bg-white px-3.5 text-xs font-semibold text-[#586273] transition hover:border-[#C4C9D0] hover:bg-[#FAFBFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/25">
                  <Archive aria-hidden="true" className="size-4" strokeWidth={1.7} />
                  Trash
                </button>
              ) : null}
              {selectedCategory.addLabel ? (
                <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#9F1010] px-4 text-xs font-semibold text-white transition hover:bg-[#7E0C0C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/35">
                  <Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  {selectedCategory.addLabel}
                </button>
              ) : null}
            </div>
          </header>

          <div className="p-4 sm:p-6">
            <MasterDataTable category={selectedCategory} />
          </div>
        </div>
      </section>
    </main>
  );
}
