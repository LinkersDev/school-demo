import { cn } from '../../../utils/cn'

interface ChildTab {
  id: number
  name: string
}

export default function ChildSelector({
  children: items,
  activeId,
  onSelect,
}: {
  children: ChildTab[]
  activeId: number | undefined
  onSelect: (id: number) => void
}) {
  if (items.length <= 1) return null

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {items.map(c => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer',
            activeId === c.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
          )}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}
