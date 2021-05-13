const path = require('path');
const { overrideDevServer } = require('customize-cra');

const addBefore = before => config => {
    config.before = before;
    return config
}

module.exports = {
    webpack: function (config, env) {
        return config;
    },
    devServer: overrideDevServer(
        addBefore((app) => {
            app.get('*.wasm', function (req, res, next) {
                res.sendFile(req.url, {
                    root: path.resolve(__dirname),
                    headers: {
                        'content-type': 'application/wasm'
                    }
                }, (err) => {
                    if (err) next(err)
                });
            });
        })
    )
}