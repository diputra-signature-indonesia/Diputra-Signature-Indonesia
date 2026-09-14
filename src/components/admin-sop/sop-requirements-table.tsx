'use client';

import { initialSopRequirements, type SopRequirementRow } from '@/data/admin-sop/sop-dummy-data';
import { Check, Pencil, Plus, TableProperties, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SopPanelHeader } from './sop-panel-header';

export function SopRequirementsTable() {
  const [rows, setRows] = useState<SopRequirementRow[]>(initialSopRequirements);
  const [editing, setEditing] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const updateRow = (rowId: string, key: keyof Omit<SopRequirementRow, 'id'>, value: string) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
  };

  const addRow = () => {
    const id = `requirement-${Date.now()}`;
    setRows((current) => [...current, { id, item: '', price: '', notes: '' }]);
    setEditingRowId(id);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="p-5">
        <SopPanelHeader
          icon={TableProperties}
          title="Price list"
          action={
            <button
              type="button"
              onClick={() => { setEditing((current) => !current); setEditingRowId(null); }}
              className={`inline-flex h-8 items-center gap-2 rounded px-4 text-[11px] font-semibold transition ${editing ? 'bg-[#8C1010] text-white hover:bg-[#710D0D]' : 'border border-[#9EACBF] text-[#5B6472] hover:bg-gray-50'}`}
            >
              {editing ? 'Done' : 'Edit'}
              {editing ? <Check aria-hidden="true" className="size-3.5" /> : <Pencil aria-hidden="true" className="size-3.5" />}
            </button>
          }
        />
      </div>

      <div className="overflow-x-auto border-t border-[#E4E7EB]">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead className="bg-[#F8F9FA] text-[10px] font-bold uppercase tracking-[0.05em] text-[#536075]">
            <tr>
              <th className="px-5 py-3.5">Item / Description</th>
              <th className="w-40 px-5 py-3.5">Price</th>
              <th className="w-56 px-5 py-3.5">Notes</th>
              {editing ? <th className="w-24 px-5 py-3.5 text-right">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowEditing = editing && editingRowId === row.id;

              return (
                <tr key={row.id} className="border-t border-[#E4E7EB] text-xs text-[#283141]">
                  {(['item', 'price', 'notes'] as const).map((key) => (
                    <td key={key} className="px-5 py-4">
                      {rowEditing ? (
                        <input
                          autoFocus={key === 'item'}
                          value={row[key]}
                          onChange={(event) => updateRow(row.id, key, event.target.value)}
                          placeholder={key === 'item' ? 'Requirement name' : key === 'price' ? 'Price' : 'Notes'}
                          className="h-8 w-full rounded border border-[#D9DDE3] bg-[#FAFBFC] px-2 outline-none focus:border-[#8C1010] focus:ring-2 focus:ring-[#8C1010]/10"
                        />
                      ) : (
                        <span className={key === 'item' ? 'font-medium text-[#292323]' : ''}>{row[key] || '—'}</span>
                      )}
                    </td>
                  ))}
                  {editing ? (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditingRowId(rowEditing ? null : row.id)} aria-label={`${rowEditing ? 'Save' : 'Edit'} ${row.item || 'new requirement'}`} className="flex size-8 items-center justify-center rounded-lg text-[#536075] hover:bg-gray-100 hover:text-[#8C1010]">
                          {rowEditing ? <Check aria-hidden="true" className="size-4" /> : <Pencil aria-hidden="true" className="size-4" />}
                        </button>
                        <button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label={`Delete ${row.item || 'new requirement'}`} className="flex size-8 items-center justify-center rounded-lg text-[#8C1010] hover:bg-[#FFF1F0]">
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="border-t border-[#E4E7EB] bg-[#FAFBFC] p-4">
          <button type="button" onClick={addRow} className="inline-flex h-9 items-center gap-2 rounded border border-dashed border-[#B5BDC8] bg-white px-4 text-xs font-semibold text-[#536075] transition hover:border-[#8C1010] hover:text-[#8C1010]">
            <Plus aria-hidden="true" className="size-4" /> Add Row
          </button>
        </div>
      ) : null}
    </section>
  );
}
