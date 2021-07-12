import localStorageService from '../services/localStorage.service';

import * as prettySize from 'prettysize';

export const PATH_NAMES = {
  '/new': 'drive-web-register',
  '/login': 'drive-web-login',
  '/storage': 'drive-web-storage',
  '/settings': 'drive-web-settings',
  '/invite': 'drive-web-invite',
  '/remove': 'drive-web-remove'
};

export function getUserData() {
  return localStorageService.getUser();
}

export function getUuid() {
  return getUserData().uuid;
}

function identifyPlanName(bytes: number): string {
  return bytes === 0 ? 'Free 2GB' : prettySize(bytes);
}

const payload = {
  usage: 0,
  limit: 0,
  plan: 0
};

export function identifyUsage(newValue) {
  if (newValue !== payload.usage) {
    payload.usage = newValue;
    analytics.identify(getUuid(), { userId: getUuid(), storage: newValue, platform: 'web' });
  }
}

export function identifyPlan(newValue: number) {
  if (newValue !== payload.plan) {
    payload.plan = newValue;
    analytics.identify(getUuid(), { userId: getUuid(), plan: identifyPlanName(newValue), platform: 'web' });
  }
}

export const analytics = window.analytics;
