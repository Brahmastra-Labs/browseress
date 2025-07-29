const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    'ws-transport': './lib/transports/ws-transport.js',
    'fs-opfs-adapter': './lib/polyfills/fs-opfs-adapter.js',
    'browseress': './lib/browseress.js' // Main entry point (to be created)
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: '[name]',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /fs-opfs-worker\.js$/,
        use: 'worker-loader'
      }
    ]
  },
  resolve: {
    fallback: {
      // Node.js polyfills for browser
      'events': require.resolve('events/'),
      'buffer': require.resolve('buffer/'),
      'path': path.resolve(__dirname, 'lib/polyfills/path.js'),
      'http': path.resolve(__dirname, 'lib/polyfills/http-stub.js'),
      'net': path.resolve(__dirname, 'lib/polyfills/net-stub.js'),
      'fs': path.resolve(__dirname, 'lib/polyfills/fs-opfs-adapter.js')
    }
  },
  target: 'web',
  devtool: 'source-map'
};