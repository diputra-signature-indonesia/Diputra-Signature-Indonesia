export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
};

export type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  getRowKey?: (row: T, index: number) => string;
};

export function DataTable<T>({ data, columns, getRowKey }: DataTableProps<T>) {
  return (
    <table className="w-full table-fixed">
      <thead className="bg-gray-200">
        <tr>
          {columns.map((col, i) => (
            <th key={i} style={{ width: col.width, textAlign: col.align }} className="px-3 py-3 text-sm font-semibold">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row, i) => (
          <tr key={getRowKey ? getRowKey(row, i) : i} className="cursor-pointer py-3 text-sm transition-colors duration-200 hover:bg-gray-300">
            {columns.map((col, j) => (
              <td key={j} style={{ width: col.width, textAlign: col.align }} className="border-b-2 border-gray-100 px-3 py-5">
                {col.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
