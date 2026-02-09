import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'services/env.service';

/**
 * Handles OAuth-like authentication flow for external authentication (Meet, etc.)
 * using postMessage for secure communication between popup and parent window.
 */

/**
 * List of allowed target origins for postMessage
 */
const ALLOWED_TARGET_ORIGINS = ['https://meet.internxt.com'];

/**
 * Checks if an origin matches allowed domains
 * @param {string} origin - The origin to check
 * @returns {boolean} True if the origin is allowed
 */
const isAllowedOrigin = (origin: string): boolean => {
  if (ALLOWED_TARGET_ORIGINS.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    if (
      url.protocol === 'https:' &&
      (url.hostname === 'meet-web.pages.dev' ||
        url.hostname.endsWith('.meet-web.pages.dev') ||
        url.hostname.endsWith('-meet-web.storageinternxt.workers.dev'))
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
};

/**
 * Message types for postMessage communication
 */
export enum OAuthMessageType {
  SUCCESS = 'INTERNXT_AUTH_SUCCESS',
  ERROR = 'INTERNXT_AUTH_ERROR',
}

/**
 * Success message payload structure
 */
export interface OAuthSuccessPayload {
  mnemonic: string;
  newToken: string;
}

/**
 * Success message structure
 */
export interface OAuthSuccessMessage {
  type: OAuthMessageType.SUCCESS;
  payload: OAuthSuccessPayload;
}

/**
 * Gets the target origin for postMessage based on the opener's origin
 *
 * @returns {string | null} The validated origin or null if not allowed
 */
const getTargetOrigin = (): string | null => {
  if (!window.opener) {
    return null;
  }

  try {
    const openerOrigin = window.opener.location.origin;

    if (isAllowedOrigin(openerOrigin)) {
      return openerOrigin;
    }

    return null;
  } catch (error) {
    console.error('[OAuth] Error accessing opener origin:', error);
    // use referrer as fallback
    const referrer = document.referrer;
    if (referrer) {
      try {
        const referrerOrigin = new URL(referrer).origin;
        if (isAllowedOrigin(referrerOrigin)) {
          return referrerOrigin;
        }
      } catch (e) {
        console.error('[OAuth] Error parsing referrer:', e);
      }
    }

    if (!envService.isProduction()) {
      return '*';
    }

    return null;
  }
};

/**
 * Sends authentication success data to external app via postMessage
 *
 * Security: Validates target origin before sending credentials
 *
 * @param {UserSettings} user - User data with mnemonic and keys
 * @param {string} newToken - Authentication token (will be base64 encoded)
 * @returns {boolean} True if message was sent successfully, false otherwise
 */
export const sendAuthSuccess = (user: UserSettings, newToken: string): boolean => {
  if (!window.opener) {
    return false;
  }

  const targetOrigin = getTargetOrigin();

  if (!targetOrigin) {
    return false;
  }

  try {
    const message: OAuthSuccessMessage = {
      type: OAuthMessageType.SUCCESS,
      payload: {
        mnemonic: btoa(user.mnemonic),
        newToken: btoa(newToken),
      },
    };
    window.opener.postMessage(message, targetOrigin);
    window.close();
    return true;
  } catch (error) {
    console.error('[OAuth] Error sending auth success message:', error);
    return false;
  }
};

/**
 * Checks if the current page was opened as an OAuth popup
 *
 * @returns {boolean} True if window.opener exists
 */
export const isOAuthPopup = (): boolean => {
  return !!window.opener;
};

/**
 * Gets the list of allowed target origins (for configuration/debugging)
 *
 * @returns {string[]} Array of allowed origins
 */
export const getAllowedOrigins = (): string[] => {
  return [...ALLOWED_TARGET_ORIGINS];
};

const oauthService = {
  sendAuthSuccess,
  isOAuthPopup,
  getAllowedOrigins,
  OAuthMessageType,
};

export default oauthService;
