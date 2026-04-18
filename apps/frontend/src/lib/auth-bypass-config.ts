// Constants that are safe to import from both server and client components.
// Kept separate from auth-bypass.ts because that file imports from
// '@clerk/nextjs/server', which is server-only.

export const isAuthBypassEnabled =
  process.env.NEXT_PUBLIC_DISABLE_CLERK_AUTH === 'true';

export const BYPASS_USER_CLERK_ID =
  process.env.NEXT_PUBLIC_BYPASS_USER_CLERK_ID ?? 'demo_client_001';
