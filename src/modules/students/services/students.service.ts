import api from '../../../services/api'

export interface Student {
  id: number
  student_id: string
  first_name: string
  last_name: string
  full_name: string
  date_of_birth: string
  gender: string
  assigned_class: number | null
  assigned_class_detail: { id: number; name: string; grade_level: string } | null
  photo: string | null
  medical_notes: string
  behavior_notes: string
  is_active: boolean
  created_at: string
}

export interface ParentLookupResult {
  found: boolean
  parent: {
    id: number
    name: string
    email: string
    phone: string
    children_count: number
  } | null
}

export interface EnrollPayload {
  // Student — student_id is optional; backend auto-generates if omitted
  first_name: string
  last_name: string
  student_id?: string
  gender: string
  assigned_class: string | null
  date_of_birth?: string
  address?: string
  medical_notes?: string
  behavior_notes?: string
  // Parent (all optional; email auto-generated when name supplied without email)
  parent_email?: string
  parent_first_name?: string
  parent_last_name?: string
  parent_phone?: string
  parent_relationship?: string
  parent_is_primary?: boolean
}

export interface EnrollResponse {
  student: Student
  parent_status: 'none' | 'linked_existing' | 'created'
  parent_name: string | null
  parent_id: number | null
}

export interface LinkParentPayload {
  parent_email?: string
  parent_first_name?: string
  parent_last_name?: string
  parent_phone?: string
  parent_relationship?: string
  parent_is_primary?: boolean
}

export interface LinkParentResponse {
  student_id: number
  parent_status: 'linked_existing' | 'created'
  parent_name: string
  parent_id: number
}

export const studentsService = {
  list:       (params?: object) => api.get('/students/', { params }).then(r => r.data),
  get:        (id: number)      => api.get(`/students/${id}/`).then(r => r.data),
  create:     (data: FormData | object) => api.post('/students/', data).then(r => r.data),
  update:     (id: number, data: object) => api.patch(`/students/${id}/`, data).then(r => r.data),
  delete:     (id: number)      => api.delete(`/students/${id}/`),
  getParents: (id: number)      => api.get(`/students/${id}/parents/`).then(r => r.data),

  /** Create a new student and optionally create/link a parent in one request. */
  enroll: (data: EnrollPayload): Promise<EnrollResponse> =>
    api.post('/students/enroll/', data).then(r => r.data),

  /** Link (or create and link) a parent to an existing student. */
  linkParent: (studentId: number, data: LinkParentPayload): Promise<LinkParentResponse> =>
    api.post(`/students/${studentId}/link-parent/`, data).then(r => r.data),
}

export const parentsService = {
  /**
   * Look up an existing parent by email or phone before enrollment.
   * Used to avoid creating duplicate accounts.
   */
  lookup: (params: { email?: string; phone?: string }): Promise<ParentLookupResult> =>
    api.get('/parents/lookup/', { params }).then(r => r.data),
}
