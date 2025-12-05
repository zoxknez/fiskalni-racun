# API Middleware

## Rate Limiting

Rate limiting middleware za zaštitu od brute force napada i abuse-a.

### Usage

```typescript
import { withRateLimit } from '../middleware/rateLimit'

// Wrap handler sa rate limiting-om
export const handleLogin = withRateLimit(
  'auth:login', // endpoint identifier
  handleLoginInternal, // handler function
  async (req) => {
    // Optional: get identifier from request (e.g., email)
    const { email } = await req.json()
    return email
  }
)
```

### Configuration

Rate limit konfiguracije se nalaze u `api/middleware/rateLimit.ts`:

```typescript
export const rateLimitConfigs = {
  'auth:login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts
  },
  // ...
}
```

### Production

✅ **Upstash Redis je već integrisan!**

Rate limiting automatski koristi Redis ako su konfigurisani env variables:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Ako Redis nije konfigurisan, automatski pada na in-memory store (development mode).

**Setup:**
1. Kreirati Upstash account na https://upstash.com
2. Kreirati Redis database
3. Dodati env variables u `.env`:
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Kako radi:**
- Production: Koristi Upstash Redis za distributed rate limiting
- Development: Koristi in-memory store (fallback)
- Automatski fallback ako Redis nije dostupan

