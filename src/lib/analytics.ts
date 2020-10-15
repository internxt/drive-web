export function getUuid() {
    return JSON.parse(localStorage.getItem('xUser') || "{}").uuid
}

export const analytics = window.analytics