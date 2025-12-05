# Error Handling System

Centralizovani error handling sistem za konzistentne error responses kroz aplikaciju.

## Error Classes

### AppError (Base)
Base error class sa error code, message, status code i details.

### ValidationError (400)
Za validation errors - invalid input, missing fields, etc.

### UnauthorizedError (401)
Za authentication errors - invalid credentials, missing token, etc.

### ForbiddenError (403)
Za authorization errors - insufficient permissions.

### NotFoundError (404)
Za resource not found errors.

### ConflictError (409)
Za conflict errors - duplicate resources, etc.

### RateLimitError (429)
Za rate limit exceeded errors.

### InternalServerError (500)
Za unexpected server errors.

## Usage

### Throwing Errors

```typescript
import { ValidationError, UnauthorizedError } from '@/lib/errors'

// Validation error
if (!email) {
  throw new ValidationError('Email is required')
}

// Unauthorized error
if (!userId) {
  throw new UnauthorizedError()
}

// NotFound error
if (!user) {
  throw new NotFoundError('User')
}
```

### Handling Errors

```typescript
import { handleError, withErrorHandling } from '@/lib/errors/handler'

// Manual handling
try {
  // ... code
} catch (error) {
  return handleError(error)
}

// Automatic handling wrapper
export const handleLogin = withErrorHandling(async (req: Request) => {
  // ... handler code
  // Errors are automatically caught and handled
})
```

## Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}, // Optional
  "retryAfter": 60 // Optional, for rate limit errors
}
```

