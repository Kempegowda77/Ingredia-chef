// Utility functions for mock authentication token handling
// The token is a simple base64‑encoded email string stored in localStorage.
// In a real app this would be a JWT signed by the backend.

const AUTH_KEY = 'ingredia_auth_token';

/**
 * Store a mock auth token securely.
 * @param {string} token – base64‑encoded email or any opaque string.
 */
export function setAuthToken(token) {
  try {
    if (typeof token !== 'string' || !token) throw new Error('Invalid token');
    localStorage.setItem(AUTH_KEY, token);
  } catch (e) {
    console.warn('[Security] Failed to set auth token', e);
  }
}

/** Retrieve the stored token (or null). */
export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_KEY) || null;
  } catch (e) {
    console.warn('[Security] Failed to read auth token', e);
    return null;
  }
}

/** Clear the auth token – used for logout. */
export function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (e) {
    console.warn('[Security] Failed to clear auth token', e);
  }
}
