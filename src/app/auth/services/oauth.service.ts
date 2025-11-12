import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'app/core/services/env.service';

/**
 * Handles OAuth-like authentication flow for external authentication (Meet, etc.)
 * using postMessage for secure communication between popup and parent window.
 */

/**
 * List of allowed target origins for postMessage
 */
const ALLOWED_TARGET_ORIGINS = ['https://meet.internxt.com'];

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
  token: string;
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
 * Error message structure
 */
export interface OAuthErrorMessage {
  type: OAuthMessageType.ERROR;
  error: string;
}

/**
 * Gets the target origin for postMessage based on the opener's origin
 *
 * @returns {string | null} The validated origin or null if not allowed
 */
const getTargetOrigin = (): string | null => {
  if (!window.opener) {
    console.warn('[OAuth] window.opener is not available');
    return null;
  }

  try {
    const openerOrigin = window.opener.location.origin;

    if (ALLOWED_TARGET_ORIGINS.includes(openerOrigin)) {
      return openerOrigin;
    }

    return null;
  } catch (error) {
    // If we can't access opener.location (cross-origin), use referrer as fallback
    const referrer = document.referrer;
    if (referrer) {
      try {
        const referrerOrigin = new URL(referrer).origin;
        if (ALLOWED_TARGET_ORIGINS.includes(referrerOrigin)) {
          console.log('[OAuth] Using referrer origin:', referrerOrigin);
          return referrerOrigin;
        }
        console.warn('[OAuth] Referrer origin not in allowed list:', referrerOrigin);
      } catch (e) {
        console.error('[OAuth] Error parsing referrer:', e);
      }
    }

    if (!envService.isProduction()) {
      console.warn('[OAuth] Development mode: using * as target origin');
      return '*';
    }

    console.error('[OAuth] Could not determine safe target origin');
    return null;
  }
};

/**
 * Sends authentication success data to external app via postMessage
 *
 * Security: Validates target origin before sending credentials
 *
 * @param {UserSettings} user - User data with mnemonic and keys
 * @param {string} token - Authentication token (will be base64 encoded)
 * @param {string} newToken - New authentication token (will be base64 encoded)
 * @returns {boolean} True if message was sent successfully, false otherwise
 */
export const sendAuthSuccess = (user: UserSettings, token: string, newToken: string): boolean => {
  if (!window.opener) {
    console.warn('[OAuth] Cannot send auth success: window.opener is not available');
    return false;
  }

  const targetOrigin = getTargetOrigin();

  if (!targetOrigin) {
    console.warn('[OAuth] Cannot send auth success: invalid target origin');
    return false;
  }

  try {
    const message: OAuthSuccessMessage = {
      type: OAuthMessageType.SUCCESS,
      payload: {
        mnemonic: btoa(user.mnemonic),
        token: btoa(token),
        newToken: btoa(newToken),
      },
    };
    window.opener.postMessage(message, targetOrigin);
    window.close();
    return true;
  } catch (error) {
    console.error('[OAuth] Error sending auth data:', error);
    return false;
  }
};

/**
 * Sends authentication error to external app via postMessage
 *
 * Security: Validates target origin before sending error
 *
 * @param {string} errorMessage - Error message to send
 * @returns {boolean} True if message was sent successfully, false otherwise
 */
export const sendAuthError = (errorMessage: string): boolean => {
  if (!window.opener) {
    console.warn('[OAuth] window.opener is not available, cannot send error');
    return false;
  }

  const targetOrigin = getTargetOrigin();

  if (!targetOrigin) {
    console.error('[OAuth] Cannot send auth error: invalid or disallowed target origin');
    return false;
  }

  try {
    const message: OAuthErrorMessage = {
      type: OAuthMessageType.ERROR,
      error: errorMessage,
    };

    console.log('[OAuth] Sending auth error to origin:', targetOrigin);
    window.opener.postMessage(message, targetOrigin);
    return true;
  } catch (error) {
    console.error('[OAuth] Error sending auth error:', error);
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
  sendAuthError,
  isOAuthPopup,
  getAllowedOrigins,
  OAuthMessageType,
};

export default oauthService;
