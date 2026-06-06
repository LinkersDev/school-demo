export interface MessageContact {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  role: string
  role_display: string
  /** Parent messaging: subject names this teacher teaches for the parent's children. */
  teaching_subjects?: string[]
}

export interface ConversationSummary {
  user_id: number
  full_name: string
  email: string
  role: string
  role_display: string
  last_message_preview: string
  last_message_at: string
  teaching_subjects?: string[]
}

export interface ChatMessageRow {
  id: number
  sender: number
  recipient: number
  body: string
  created_at: string
  is_mine: boolean
  sender_name: string
  sender_role: string
  sender_role_display: string
}

/** Inbox segment: teachers use `staff`, `colleagues`; coordinators/admin use `teachers`. */
export type ChatRoleFilter = 'all' | 'teachers' | 'parents' | 'staff' | 'colleagues'

export type BroadcastAudience = 'all_staff' | 'all_parents' | 'teachers_only' | 'coordinators_only'
