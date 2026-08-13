import "server-only";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

export const OAUTH_STATE_COOKIE = "google_oauth_state";

// Only Google accounts on this Workspace domain may sign in — every other
// domain (including regular @gmail.com) is rejected in the callback, even
// though `hd` below already hints Google's account chooser to this domain.
// The hint alone is not a security boundary; the callback re-checks it.
export const ALLOWED_GOOGLE_DOMAIN = process.env.ALLOWED_GOOGLE_DOMAIN ?? "zeni.ai";

function getClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file (create an OAuth client in Google Cloud Console)."
    );
  }
  return { clientId, clientSecret };
}

export function buildGoogleAuthorizationUrl({
  redirectUri,
  state,
}: {
  redirectUri: string;
  state: string;
}) {
  const { clientId } = getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    // Hints Google's account chooser to the Workspace domain — a UX nicety,
    // not the security check (see ALLOWED_GOOGLE_DOMAIN above).
    hd: ALLOWED_GOOGLE_DOMAIN,
    prompt: "select_account",
  });
  return `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  hd?: string;
};

export async function exchangeGoogleAuthCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}): Promise<GoogleProfile> {
  const { clientId, clientSecret } = getClientCredentials();

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`Google token exchange failed: ${await tokenResponse.text()}`);
  }
  const { access_token } = (await tokenResponse.json()) as { access_token: string };

  // Fetched directly from Google's server with the token we just received —
  // trusted without separately verifying an id_token JWT signature.
  const profileResponse = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profileResponse.ok) {
    throw new Error(`Google userinfo request failed: ${await profileResponse.text()}`);
  }
  return profileResponse.json();
}
