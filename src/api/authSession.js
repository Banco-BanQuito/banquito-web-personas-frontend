import { buildEnv } from '../build-env';

const STORAGE_KEY = 'banquito_web_personas_auth';
const IDENTITY_PLATFORM_API_KEY = buildEnv.identityPlatformApiKey || import.meta.env.VITE_IDENTITY_PLATFORM_API_KEY || '';
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function readSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function getFreshAuthSession() {
  const session = readSession();
  if (!session?.idToken || !session.refreshToken || !IDENTITY_PLATFORM_API_KEY) {
    return session;
  }

  if (session.expiresAt && session.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return session;
  }

  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${IDENTITY_PLATFORM_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('customer');
    globalThis.dispatchEvent(new CustomEvent('logout'));
    throw new Error(data.error?.message || 'Sesion expirada');
  }

  const refreshed = {
    ...session,
    idToken: data.id_token,
    refreshToken: data.refresh_token || session.refreshToken,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
  writeSession(refreshed);
  return refreshed;
}
