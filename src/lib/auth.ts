import Settings from "./settings"

function getHeaders(withAuth: Boolean, withMnemonic: Boolean): Headers {
    const headers = new Headers()
    
    headers.append('content-type', 'application/json; charset=utf-8')
    headers.append('internxt-version', '1.0.0')
    headers.append('internxt-client', 'x-cloud-web')

    if (withAuth) {
        headers.append('Authorization', `Bearer ${Settings.get("xToken")}`)
    }

    if (withMnemonic) {
        headers.append('internxt-mnemonic', `${Settings.get("xMnemonic")}`)
    }

    return headers;
}

export {
    getHeaders
}