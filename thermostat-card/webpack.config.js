const card = 'thermostat-card';
module.exports = {
    entry: `./src/${card}.js`,
    output: {
        path: __dirname,
        filename: `${card}.bundle.js`
      }
};
