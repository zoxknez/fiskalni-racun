# Security Policy

## Supported Versions

Currently supporting the latest version only.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Known Dependencies Vulnerabilities

### Accepted Risks (Low Impact)

#### 1. esbuild <=0.24.2 (Moderate - GHSA-67mh-4wv8-2f99)
- **Status:** Accepted
- **Reason:** Development dependency only, does not affect production builds
- **Impact:** SSRF vulnerability in development server
- **Mitigation:** Development server is not exposed to public internet
- **Fix Available:** Yes, but requires breaking changes to Vite 7.x
- **Action:** Will be addressed in next major version update

#### 2. xlsx (High - GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9)
- **Status:** Accepted
- **Reason:** Only used for EXPORT operations, not parsing user files
- **Impact:** Prototype Pollution and ReDoS in parsing functions
- **Mitigation:** 
  - We only use `XLSX.utils.json_to_sheet()` and `XLSX.write()` for export
  - We DO NOT use vulnerable parsing functions (`XLSX.read()`, `XLSX.readFile()`)
  - No user-provided Excel files are processed
- **Risk Assessment:** LOW - vulnerability is in code paths we don't use
- **Alternative:** May switch to `exceljs` or `xlsx-populate` in future

## Reporting a Vulnerability

If you discover a security vulnerability, please email support@fiskalniracun.app or open a GitHub issue.

We take security seriously and will respond within 48 hours.

### What to Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Security Best Practices

This application follows these security practices:

1. **No Data Collection** - All data stored locally on user device
2. **No External API Calls** - Except for optional analytics (Sentry, PostHog)
3. **Input Validation** - All user inputs validated with Zod schemas
4. **Content Security Policy** - Strict CSP headers in production
5. **HTTPS Only** - All external resources loaded over HTTPS
6. **No Hardcoded Secrets** - API keys stored in environment variables
7. **Dependency Updates** - Regular security audits and updates

## Audit Status

Last audit: October 21, 2025

```bash
npm audit
# 3 vulnerabilities (2 moderate, 1 high)
# All accepted with documented mitigation
```

## Future Security Improvements

- [ ] Migrate to Vite 7.x to fix esbuild vulnerability
- [ ] Consider alternatives to xlsx library
- [ ] Implement automated security scanning in CI/CD
- [ ] Add Dependabot for automated dependency updates
