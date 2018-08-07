module.exports = {
  entry: './src/card.js',
  output: {
    path: __dirname,
    filename: 'thermostat-card.js'
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
