/**
 * Commitlint Configuration
 * 
 * Enforces conventional commit messages
 * 
 * Format: type(scope?): subject
 * 
 * Examples:
 * - feat(receipts): add export to PDF
 * - fix(qr): resolve scanner crash on Android
 * - docs: update API documentation
 * - refactor(db): optimize query performance
 */

export default {
  extends: ['@commitlint/config-conventional'],
  
  rules: {
    // Type enum
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation only
        'style',     // Code style (formatting, semicolons, etc)
        'refactor',  // Code change that neither fixes a bug nor adds a feature
        'perf',      // Performance improvement
        'test',      // Adding or updating tests
        'build',     // Build system or dependencies
        'ci',        // CI configuration
        'chore',     // Other changes that don't modify src or test files
        'revert',    // Revert a previous commit
      ],
    ],
    
    // Scope enum (optional, customize for your project)
    'scope-enum': [
      1,
      'always',
      [
        'receipts',
        'devices',
        'warranties',
        'auth',
        'ocr',
        'qr',
        'db',
        'api',
        'ui',
        'pwa',
        'analytics',
        'security',
        'performance',
        'a11y',
        'i18n',
        'deps',
      ],
    ],
    
    // Subject rules
    'subject-case': [2, 'never', ['upper-case']], // Don't start with uppercase
    'subject-empty': [2, 'never'], // Subject is required
    'subject-full-stop': [2, 'never', '.'], // No period at the end
    
    // Body and footer rules
    'body-leading-blank': [1, 'always'], // Blank line before body
    'footer-leading-blank': [1, 'always'], // Blank line before footer
    
    // Length rules
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 100],
  },
}

