import Analytics from 'analytics-node';

export function getUuid() {
    return JSON.parse(localStorage.getItem('xUser') || "{}").uuid
}

export const analytics = new Analytics(process.env.REACT_APP_SEGMENT_KEY)
