export function getUserData() {
    return JSON.parse(localStorage.getItem('xUser') || "{}")
}

export function getUuid() {
    return getUserData().uuid
}

export const analytics = window.analytics