import DOMPurify from 'dompurify'

/**
 * Modern XSS Protection with DOMPurify
 *
 * Sanitizes user input to prevent XSS attacks
 * Use this for any user-generated content that will be displayed
 */

/**
 * Sanitize HTML content
 * Removes dangerous tags and attributes
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?):)?\/\//i,
  })
}

/**
 * Sanitize plain text
 * Strips ALL HTML tags
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize URL
 * Ensures URL is safe and valid
 */
export function sanitizeURL(url: string): string {
  try {
    const parsed = new URL(url)

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return ''
    }

    return DOMPurify.sanitize(url, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    })
  } catch {
    return ''
  }
}

/**
 * Sanitize file name
 * Removes dangerous characters from file names
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255)
}

/**
 * Escape HTML entities
 * Converts < > & " ' to HTML entities
 */
export function escapeHTML(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Safe component for rendering user HTML
 * Use this for displaying user-generated HTML content
 */
export interface SafeHTMLProps {
  html: string
  className?: string
  allowedTags?: string[]
}

/**
 * React component that safely renders HTML
 */
export function SafeHTML({ html, className, allowedTags }: SafeHTMLProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
  })

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
