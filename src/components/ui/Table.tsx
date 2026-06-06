import { cn } from '../../utils/cn'

interface Column<T> {
  header: string
  accessor?: keyof T
  render?: (row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: keyof T
  loading?: boolean
  loadingMessage?: string
  emptyMessage?: string
  /** Merged with default wrapper classes; use for themed shells (e.g. homework explorer). */
  wrapperClassName?: string
}

export function Table<T extends { id?: number | string }>({
  columns,
  data,
  keyField = 'id',
  loading,
  loadingMessage = 'Loading...',
  emptyMessage = 'No data found',
  wrapperClassName,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-gray-200', wrapperClassName)}>
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={cn('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400 text-sm">
                {loadingMessage}
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={String(row[keyField])} className="transition-colors hover:bg-gray-50">
                {columns.map((col, i) => (
                  <td key={i} className={cn('px-4 py-3 text-sm text-gray-700', col.className)}>
                    {col.render ? col.render(row) : col.accessor ? String(row[col.accessor] ?? '-') : ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
