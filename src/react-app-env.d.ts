/// <reference types="react-scripts" />

declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: 'development' | 'production' | 'test'
        PUBLIC_URL: string
        REACT_APP_CRYPTO_SECRET: string
        REACT_APP_BRIDGE: string
        REACT_APP_STRIPE_PK: string
        REACT_APP_STRIPE_TEST_PK: string
        REACT_APP_PROXY_URL: string
        REACT_APP_API_URL: string
        REACT_APP_SEGMENT_KEY: string
    }
}

interface SegmentAnalytics {
    
}

interface Window {
    Stripe: any
    analytics: any
}
