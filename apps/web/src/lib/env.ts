const required = {
  VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
} as const

for (const [key, value] of Object.entries(required)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

export const env = required as { readonly [K in keyof typeof required]: string }