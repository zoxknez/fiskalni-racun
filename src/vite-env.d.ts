/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

import type { PostHog } from 'posthog-js'

interface ImportMetaEnv {
	readonly DEV: boolean
	readonly PROD: boolean
	readonly MODE: string
	readonly BASE_URL: string
	readonly VITE_SUPABASE_URL: string
	readonly VITE_SUPABASE_ANON_KEY: string
	readonly VITE_SENTRY_DSN?: string
	readonly VITE_GA_MEASUREMENT_ID?: string
	readonly VITE_POSTHOG_KEY?: string
	readonly VITE_VERCEL_ANALYTICS_ID?: string
	readonly VITE_APP_VERSION?: string
	readonly VITE_APP_ENV?: 'development' | 'staging' | 'production'
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

declare global {
	interface Window {
		posthog?: PostHog
	}
}

export {}
