const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/** Returns an error message if invalid, otherwise null */
export function validateHomeworkImageFile(file: File | null | undefined): string | null {
  if (!file) return null
  if (file.size > MAX_BYTES) return 'Image must be 2MB or smaller.'
  if (!ALLOWED.has(file.type)) return 'Only JPEG, PNG, WebP, or GIF images are allowed.'
  return null
}
