const path = require('path');
const webpack = require('webpack');

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
      type: 'umd'
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
      'fs': path.resolve(__dirname, 'lib/polyfills/fs-opfs-adapter.js'),
      'crypto': false,
      'string_decoder': false,
      'url': false,
      'querystring': false,
      'zlib': false,
      'stream': path.resolve(__dirname, 'lib/polyfills/stream-stub.js'),
      'util': path.resolve(__dirname, 'lib/polyfills/util-stub.js'),
      'async_hooks': false
    }
  },
  target: 'web',
  devtool: 'source-map',
  plugins: [
    new webpack.ProvidePlugin({
      setImmediate: [path.resolve(__dirname, 'lib/polyfills/setimmediate.js'), 'setImmediate'],
      clearImmediate: [path.resolve(__dirname, 'lib/polyfills/setimmediate.js'), 'clearImmediate'],
      process: path.resolve(__dirname, 'lib/polyfills/process-stub.js')
    }),
    new webpack.NormalModuleReplacementPlugin(
      /^node:/,
      (resource) => {
        const module = resource.request.replace(/^node:/, '');
        switch (module) {
          case 'path':
            resource.request = path.resolve(__dirname, 'lib/polyfills/path.js');
            break;
          case 'http':
            resource.request = path.resolve(__dirname, 'lib/polyfills/http-stub.js');
            break;
          case 'net':
            resource.request = path.resolve(__dirname, 'lib/polyfills/net-stub.js');
            break;
          case 'fs':
            resource.request = path.resolve(__dirname, 'lib/polyfills/fs-opfs-adapter.js');
            break;
          case 'events':
            resource.request = 'events';
            break;
          case 'buffer':
            resource.request = 'buffer';
            break;
          case 'querystring':
            resource.request = path.resolve(__dirname, 'lib/polyfills/querystring-stub.js');
            break;
          case 'zlib':
            resource.request = path.resolve(__dirname, 'lib/polyfills/zlib-stub.js');
            break;
          case 'util':
            resource.request = path.resolve(__dirname, 'lib/polyfills/util-stub.js');
            break;
          case 'stream':
            resource.request = path.resolve(__dirname, 'lib/polyfills/stream-stub.js');
            break;
          case 'crypto':
          case 'async_hooks':
          case 'string_decoder':
          case 'url':
            return false; // Ignore these modules
          default:
            throw new Error(`No polyfill for node:${module}`);
        }
      }
    )
  ]
};