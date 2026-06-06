import { Users } from 'lucide-react'
import type { ParentDashboardChild } from '../types'

interface ChildPickerProps {
  children: ParentDashboardChild[]
  selectedId: number | undefined
  onChange: (id: number) => void
}

export default function ChildPicker({ children, selectedId, onChange }: ChildPickerProps) {
  if (children.length <= 1) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        Child
      </span>
      <div className="flex flex-wrap gap-2">
        {children.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
              selectedId === c.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}
