export const PATH_NAMES = {
    '/new': 'drive-web-register',
    '/login': 'drive-web-login',
    '/storage': 'drive-web-storage',
    '/settings': 'drive-web-settings',
    '/invite': 'drive-web-invite',
    '/remove': 'drive-web-remove'
}

export function getUserData() {
    return JSON.parse(localStorage.getItem('xUser') || "{}")
}

export function getUuid() {
    return getUserData().uuid
}

export const analytics = window.analytics
