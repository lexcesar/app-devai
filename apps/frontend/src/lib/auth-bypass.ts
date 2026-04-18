import { auth as clerkAuth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';

const isBypassEnabled = process.env.NEXT_PUBLIC_DISABLE_CLERK_AUTH === 'true';

// clerk_id of the seed profile to impersonate in bypass mode.
// Defaults to Carlos Alberto (demo_client_001). Override via env to test multi-user flows.
export const BYPASS_USER_CLERK_ID =
  process.env.NEXT_PUBLIC_BYPASS_USER_CLERK_ID ?? 'demo_client_001';

export const isAuthBypassEnabled = isBypassEnabled;

// Display name per seed clerk_id. Keep in sync with docker/02-seed.sql so the
// UI reflects which user is "logged in" when NEXT_PUBLIC_BYPASS_USER_CLERK_ID
// is overridden.
const BYPASS_USER_NAMES: Record<string, { first: string; last: string }> = {
  demo_client_001: { first: 'Carlos', last: 'Alberto' },
  demo_client_002: { first: 'Joana', last: 'Mendes' },
  demo_professional_001: { first: 'Ricardo', last: 'Silva' },
};

const bypassDisplayName = BYPASS_USER_NAMES[BYPASS_USER_CLERK_ID] ?? {
  first: 'Desenvolvedor',
  last: 'Local',
};

export const auth = async () => {
  if (isBypassEnabled) {
    return {
      userId: BYPASS_USER_CLERK_ID,
      getToken: async () => 'bypass-token',
      sessionId: 'bypass-session',
      orgId: null,
      protect: () => {},
    } as any;
  }
  return clerkAuth();
};

export const currentUser = async () => {
  if (isBypassEnabled) {
    return {
      id: BYPASS_USER_CLERK_ID,
      firstName: bypassDisplayName.first,
      lastName: bypassDisplayName.last,
      emailAddresses: [{ emailAddress: 'dev@localhost' }],
      primaryEmailAddressId: '1',
      imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        `${bypassDisplayName.first}+${bypassDisplayName.last}`,
      )}`,
    } as any;
  }
  return clerkCurrentUser();
};
