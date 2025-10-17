/**
 * WebAuthn / Passkeys Authentication Module
 *
 * Provides support for passwordless authentication using WebAuthn API.
 * This enables users to register and login using biometric authentication,
 * security keys, or platform authenticators.
 *
 * @module webauthn
 */

import { supabase } from '@/lib/supabase'

/**
 * Registration options response from server
 */
export interface WebAuthnRegisterOptions {
  challenge: BufferSource
  rp: {
    name: string
    id?: string
  }
  user: {
    id: BufferSource
    name: string
    displayName: string
  }
  pubKeyCredParams: PublicKeyCredentialParameters[]
  timeout?: number
  attestation?: AttestationConveyancePreference
  authenticatorSelection?: AuthenticatorSelectionCriteria
}

/**
 * Login options response from server
 */
export interface WebAuthnLoginOptions {
  challenge: BufferSource
  timeout?: number
  rpId?: string
  allowCredentials?: PublicKeyCredentialDescriptor[]
  userVerification?: UserVerificationRequirement
}

/**
 * Check if WebAuthn is supported in current browser
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  )
}

/**
 * Check if platform authenticator (like Face ID, Touch ID, Windows Hello) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Register a new passkey for the current user
 *
 * @throws {Error} If WebAuthn is not supported or registration fails
 * @returns {Promise<boolean>} True if registration was successful
 */
export async function registerPasskey(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn nije podržan u vašem browseru')
  }

  try {
    // Step 1: Request registration challenge from server
    // Note: This requires a Supabase Edge Function 'webauthn-register-options'
    const { data: options, error: optionsError } = await supabase.functions.invoke(
      'webauthn-register-options',
      {
        body: {},
      }
    )

    if (optionsError || !options) {
      throw new Error('Nije moguće dobiti opcije za registraciju')
    }

    // Step 2: Create credential using WebAuthn API
    if (!options) {
      throw new Error('Opcije za registraciju nisu dostupne')
    }

    const credential = await navigator.credentials.create({
      publicKey: options as PublicKeyCredentialCreationOptions,
    })

    if (!credential) {
      throw new Error('Kreiranje passkey-a je otkazano')
    }

    // Step 3: Send credential to server for storage
    const { data, error } = await supabase.functions.invoke('webauthn-register', {
      body: {
        credential,
        // Include additional metadata if needed
        timestamp: new Date().toISOString(),
      },
    })

    if (error) {
      throw new Error('Registracija passkey-a nije uspjela')
    }

    return data?.success ?? false
  } catch (err) {
    if (err instanceof Error) {
      // Handle specific WebAuthn errors
      if (err.name === 'NotAllowedError') {
        throw new Error('Registracija je odbijena. Molimo pokušajte ponovo.')
      }
      if (err.name === 'InvalidStateError') {
        throw new Error('Ovaj passkey je već registrovan.')
      }
      throw err
    }
    throw new Error('Nepoznata greška prilikom registracije passkey-a')
  }
}

/**
 * Login using a registered passkey
 *
 * @throws {Error} If WebAuthn is not supported or login fails
 * @returns {Promise<{session: any, user: any}>} Session and user data on successful login
 */
export async function loginWithPasskey(): Promise<{
  session: Record<string, unknown>
  user: Record<string, unknown>
}> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn nije podržan u vašem browseru')
  }

  try {
    // Step 1: Request login challenge from server
    const { data: options, error: optionsError } = await supabase.functions.invoke(
      'webauthn-login-options',
      {
        body: {},
      }
    )

    if (optionsError || !options) {
      throw new Error('Nije moguće dobiti opcije za prijavu')
    }

    // Step 2: Get assertion using WebAuthn API
    if (!options) {
      throw new Error('Opcije za prijavu nisu dostupne')
    }

    const assertion = await navigator.credentials.get({
      publicKey: options as PublicKeyCredentialRequestOptions,
    })

    if (!assertion) {
      throw new Error('Prijava passkey-em je otkazana')
    }

    // Step 3: Validate on server and get Supabase session
    const { data, error } = await supabase.functions.invoke('webauthn-login', {
      body: {
        assertion,
        timestamp: new Date().toISOString(),
      },
    })

    if (error || !data?.session) {
      throw new Error('Prijava nije uspjela')
    }

    // Set the session in Supabase client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) {
      throw sessionError
    }

    return {
      session: data.session,
      user: data.user,
    }
  } catch (err) {
    if (err instanceof Error) {
      // Handle specific WebAuthn errors
      if (err.name === 'NotAllowedError') {
        throw new Error('Prijava je odbijena. Molimo pokušajte ponovo.')
      }
      if (err.name === 'InvalidStateError') {
        throw new Error('Passkey nije pronađen.')
      }
      throw err
    }
    throw new Error('Nepoznata greška prilikom prijave sa passkey-em')
  }
}

/**
 * List all registered passkeys for the current user
 * Requires backend support
 */
export async function listPasskeys(): Promise<
  Array<{
    id: string
    name: string
    created_at: string
    last_used: string | null
  }>
> {
  const { data, error } = await supabase.functions.invoke('webauthn-list-credentials')

  if (error) {
    throw new Error('Nije moguće učitati passkey-e')
  }

  return data?.credentials ?? []
}

/**
 * Remove a registered passkey
 *
 * @param credentialId - The ID of the credential to remove
 */
export async function removePasskey(credentialId: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('webauthn-remove-credential', {
    body: { credentialId },
  })

  if (error) {
    throw new Error('Nije moguće ukloniti passkey')
  }

  return data?.success ?? false
}
