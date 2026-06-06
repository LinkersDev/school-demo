/**
 * Optional browser password manager integration (Credential Management API).
 * Passwords are never written to localStorage; the browser stores them like a
 * password manager when the user chooses "Remember me" and the API is available.
 */

interface PasswordCredentialData {
  id: string
  password: string
  name?: string
}

interface PasswordCredential extends Credential {
  password?: string
}

interface PasswordCredentialWindow extends Window {
  PasswordCredential: new (init: PasswordCredentialData) => PasswordCredential
}

export function supportsPasswordCredential(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PasswordCredential' in window &&
    typeof navigator.credentials !== 'undefined' &&
    typeof navigator.credentials.store === 'function'
  )
}

/**
 * After successful login with "Remember me", offer the credential to the browser.
 * Requires secure context (HTTPS or localhost).
 */
export async function storePasswordCredential(
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  if (!supportsPasswordCredential()) return
  try {
    const Ctor = (window as unknown as PasswordCredentialWindow).PasswordCredential
    const cred = new Ctor({
      id: email,
      password,
      name: displayName,
    })
    await navigator.credentials!.store(cred)
  } catch {
    /* user denied, insecure context, or quota */
  }
}

export interface RetrievedCredentials {
  email: string
  password: string
}

/**
 * Fills email/password from the browser password store (requires user gesture in most browsers).
 */
export async function retrievePasswordCredential(): Promise<RetrievedCredentials | null> {
  if (!supportsPasswordCredential()) return null
  try {
    const c = await navigator.credentials!.get({
      password: true,
      mediation: 'optional',
    } as CredentialRequestOptions)
    if (!c || !('password' in c)) return null
    const pc = c as PasswordCredential
    const email = pc.id?.trim() ?? ''
    const password = passwordFromCredential(pc)
    if (!email) return null
    return { email, password }
  } catch {
    return null
  }
}

function passwordFromCredential(c: PasswordCredential): string {
  if (typeof c.password === 'string') return c.password
  return ''
}
