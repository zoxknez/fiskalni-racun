// Email service using Resend
// Falls back to console.log in development if not configured

import { Resend } from 'resend'

let resend: Resend | null = null

// Initialize Resend if API key is configured
if (process.env['RESEND_API_KEY']) {
  resend = new Resend(process.env['RESEND_API_KEY'])
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return resend !== null
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/reset-password?token=${token}`

  if (resend) {
    // Production: Send real email
    await resend.emails.send({
      from: process.env['RESEND_FROM_EMAIL'] || 'Fiskalni Račun <noreply@fiskalni-racun.app>',
      to: email,
      subject: 'Reset lozinke',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset lozinke</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Reset lozinke</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Zdravo,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Primili smo zahtev za resetovanje lozinke za vaš nalog. Kliknite na dugme ispod da resetujete lozinku:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Resetuj lozinku
                </a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Ako niste zatražili resetovanje lozinke, ignorišite ovaj email.
              </p>
              <p style="font-size: 14px; color: #666; margin-top: 10px;">
                Link važi 1 sat. Ako link ne radi, kopirajte i nalepite sledeći URL u browser:
              </p>
              <p style="font-size: 12px; color: #999; word-break: break-all; background: white; padding: 10px; border-radius: 4px; margin-top: 10px;">
                ${resetUrl}
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #999;">
                Fiskalni Račun - Evidencija fiskalnih računa i upravljanje garancijama
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Reset lozinke

Zdravo,

Primili smo zahtev za resetovanje lozinke za vaš nalog. Kliknite na link ispod da resetujete lozinku:

${resetUrl}

Ako niste zatražili resetovanje lozinke, ignorišite ovaj email.

Link važi 1 sat.

Fiskalni Račun
      `.trim(),
    })
  } else {
    // Development: Log to console
    console.log('[MOCK EMAIL] Password reset for:', email)
    console.log('[MOCK EMAIL] Reset URL:', resetUrl)
    console.log('[MOCK EMAIL] Token:', token)
  }
}

/**
 * Send email verification email
 */
export async function sendEmailVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/verify-email?token=${token}`

  if (resend) {
    await resend.emails.send({
      from: process.env['RESEND_FROM_EMAIL'] || 'Fiskalni Račun <noreply@fiskalni-racun.app>',
      to: email,
      subject: 'Potvrdite email adresu',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Potvrdite email adresu</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Potvrdite email adresu</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Zdravo,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hvala vam što ste se registrovali! Kliknite na dugme ispod da potvrdite vašu email adresu:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Potvrdi email
                </a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Ako niste kreirali nalog, ignorišite ovaj email.
              </p>
            </div>
          </body>
        </html>
      `,
    })
  } else {
    console.log('[MOCK EMAIL] Email verification for:', email)
    console.log('[MOCK EMAIL] Verify URL:', verifyUrl)
  }
}

/**
 * Send warranty expiry notification email
 */
export async function sendWarrantyExpiryEmail(
  email: string,
  deviceName: string,
  daysRemaining: number
): Promise<void> {
  if (resend) {
    await resend.emails.send({
      from: process.env['RESEND_FROM_EMAIL'] || 'Fiskalni Račun <noreply@fiskalni-racun.app>',
      to: email,
      subject: `Garancija ističe uskoro: ${deviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Garancija ističe uskoro</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Garancija ističe uskoro</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Zdravo,</p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Garancija za <strong>${deviceName}</strong> ističe za <strong>${daysRemaining} ${daysRemaining === 1 ? 'dan' : 'dana'}</strong>.
              </p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Preporučujemo da proverite status uređaja i kontaktirate servis ako je potrebno.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env['APP_URL'] || 'http://localhost:3000'}/warranties" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Pregledaj garancije
                </a>
              </div>
            </div>
          </body>
        </html>
      `,
    })
  } else {
    console.log('[MOCK EMAIL] Warranty expiry notification for:', email)
    console.log('[MOCK EMAIL] Device:', deviceName)
    console.log('[MOCK EMAIL] Days remaining:', daysRemaining)
  }
}
