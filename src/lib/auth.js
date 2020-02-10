function headers(withAuth, withMnemonic) {
    const headers = {
        'content-type': 'application/json; charset=utf-8'
    }

    if (withAuth) {
        headers['Authorization'] = `Bearer ${localStorage.getItem("xToken")}`
    }

    if (withMnemonic) {
        headers['internxt-mnemonic'] = localStorage.getItem("xMnemonic")
    }

    return headers;
}

module.exports = {
    getHeaders: headers
}