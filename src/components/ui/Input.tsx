import { cn } from '../../utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  labelClassName?: string
}

export function Input({ label, error, className, labelClassName, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className={cn('block text-sm font-medium text-gray-700', labelClassName)}>{label}</label>
      )}
      <input
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-sm outline-none transition',
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-300'
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  labelClassName?: string
}

export function Select({ label, error, className, children, labelClassName, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className={cn('block text-sm font-medium text-gray-700', labelClassName)}>{label}</label>
      )}
      <select
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-sm outline-none transition bg-white',
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-300'
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  labelClassName?: string
}

export function Textarea({ label, error, className, labelClassName, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className={cn('block text-sm font-medium text-gray-700', labelClassName)}>{label}</label>
      )}
      <textarea
        rows={3}
        className={cn(
          'w-full px-3 py-2 border rounded-lg text-sm outline-none transition resize-none',
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-300'
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
