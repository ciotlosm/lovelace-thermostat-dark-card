const card = 'thermostat-card';
module.exports = {
    entry: `./src/${card}.js`,
    output: {
        path: __dirname,
        filename: `${card}.bundle.js`
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    { loader: "to-string-loader" },
                    { loader: "css-loader" }
                ]
            }
        ]
    },
};
