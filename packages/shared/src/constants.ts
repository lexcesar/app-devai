// App-wide constants shared between frontend and backend

/** UTC offset for America/Sao_Paulo (BRT, no DST since 2019) */
export const TIMEZONE_OFFSET = '-03:00';

/**
 * Dev-only header to impersonate a seed profile when DISABLE_CLERK_AUTH=true.
 * The backend guard ignores this header when Clerk auth is enabled, so it is
 * safe to be sent unconditionally by the frontend in bypass mode.
 */
export const DEV_USER_ID_HEADER = 'X-Dev-User-Id';
