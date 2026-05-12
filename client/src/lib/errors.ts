import { ApiError } from './api';

/** Generic fallback. Use everywhere we don't have a specific mapping. */
export const GENERIC_LOAD_ERROR =
  "Something went wrong while loading this. Try again, or refresh the page.";

export const GENERIC_SAVE_ERROR =
  "We couldn't save those changes. Check your connection and try once more.";

const NETWORK_ERROR =
  "Couldn't reach the server. Check your connection and try again.";

/** Translate any thrown value into a single, human-readable message. */
export function messageFor(err: unknown, fallback = GENERIC_LOAD_ERROR): string {
  if (!err) return fallback;
  if (err instanceof TypeError && /fetch/i.test(err.message)) return NETWORK_ERROR;
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400:
        return "We couldn't process that request. Double-check the form and try again.";
      case 401:
        return "Your session has ended. Sign in again to continue.";
      case 403:
        return "You don't have access to that.";
      case 404:
        return "We couldn't find that. It may have been archived, or the link is out of date.";
      case 409:
        return "That conflicts with something already on file.";
      case 429:
        return "Too many attempts. Wait a minute, then try again.";
      default:
        if (err.status >= 500)
          return "Something went wrong on our end. Try again in a moment.";
        return err.message || fallback;
    }
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

/**
 * Forgot-password flow. Server messages for 400/429 are user-friendly — pass
 * them through; everything else falls back to a generic phrase.
 */
export function forgotPasswordMessageFor(err: unknown): string {
  if (!err) return GENERIC_SAVE_ERROR;
  if (err instanceof TypeError && /fetch/i.test(err.message)) return NETWORK_ERROR;
  if (err instanceof ApiError) {
    if (err.status === 429) return err.message || "Too many attempts. Wait 15 minutes and try again.";
    if (err.status === 400) {
      // Zod validation errors have a generic message — rephrase.
      if (!err.message || err.message === 'Invalid request payload')
        return "Check your details and try again.";
      return err.message;
    }
    if (err.status >= 500) return "Something went wrong on our end. Try again in a moment.";
    return err.message || GENERIC_SAVE_ERROR;
  }
  if (err instanceof Error) return err.message || GENERIC_SAVE_ERROR;
  return GENERIC_SAVE_ERROR;
}

/** Sign-in specific. Maps known auth failures to copy from the design spec. */
export function loginMessageFor(err: unknown): string {
  if (!err) return GENERIC_LOAD_ERROR;
  if (err instanceof TypeError && /fetch/i.test(err.message)) return NETWORK_ERROR;
  const raw = err instanceof Error ? err.message : String(err);
  const m = raw.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return "That email and password don't match. Try again, or reset your password.";
  if (m.includes('user not found') || m.includes('no user'))
    return "We couldn't find that account. Check the email, or ask your school admin.";
  if (m.includes('rate') || m.includes('too many'))
    return "Too many attempts. Wait a minute, then try again.";
  if (m.includes('inactive'))
    return "Your account is inactive. Ask your school admin to reactivate it.";
  return "Something went wrong on our end. Try again in a moment.";
}
