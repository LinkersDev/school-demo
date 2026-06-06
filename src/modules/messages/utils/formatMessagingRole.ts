/** Present auth/API role slug in short title case for chat headers. */
export function formatMessagingRole(role: string | null | undefined): string {
  if (!role) return 'User'
  const r = role.replace(/_/g, ' ')
  return r.charAt(0).toUpperCase() + r.slice(1)
}
