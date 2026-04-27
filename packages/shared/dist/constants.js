"use strict";
// App-wide constants shared between frontend and backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTING_AS_HEADER = exports.DEV_USER_ID_HEADER = exports.TIMEZONE_OFFSET = void 0;
/** UTC offset for America/Sao_Paulo (BRT, no DST since 2019) */
exports.TIMEZONE_OFFSET = '-03:00';
/**
 * Dev-only header to impersonate a seed profile when DISABLE_CLERK_AUTH=true.
 * The backend guard ignores this header when Clerk auth is enabled, so it is
 * safe to be sent unconditionally by the frontend in bypass mode.
 */
exports.DEV_USER_ID_HEADER = 'X-Dev-User-Id';
/**
 * Header sent by the frontend to declare which role context the user is
 * operating under when they have multiple active roles.
 * Example: "X-Acting-As: professional"
 */
exports.ACTING_AS_HEADER = 'X-Acting-As';
