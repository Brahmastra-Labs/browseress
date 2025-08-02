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
    alias: {
      './view': path.resolve(__dirname, 'lib/polyfills/view-browser.js')
    },
    fallback: {
      'events': require.resolve('events'),
      'node:events': require.resolve('events'),
      'buffer': require.resolve('buffer'),
      'path': path.resolve(__dirname, 'lib/polyfills/path.js'),
      'http': path.resolve(__dirname, 'lib/polyfills/http-stub.js'),
      'net': path.resolve(__dirname, 'lib/polyfills/net-stub.js'),
      'fs': path.resolve(__dirname, 'lib/polyfills/fs-opfs-adapter.js'),
      'crypto': path.resolve(__dirname, 'lib/polyfills/crypto-stub.js'),
      'string_decoder': false,
      'url': require.resolve('url'),
      'parseurl': require.resolve('parseurl'),
      'querystring': require.resolve('qs'),
      'qs': require.resolve('qs'),
      'zlib': path.resolve(__dirname, 'lib/polyfills/zlib-stub.js'),
      'node:zlib': path.resolve(__dirname, 'lib/polyfills/zlib-stub.js'),
      'stream': path.resolve(__dirname, 'lib/polyfills/stream-stub.js'),
      'util': require.resolve('util/'),
      'async_hooks': path.resolve(__dirname, 'lib/polyfills/async-hooks-stub.js')
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
            resource.request = require.resolve('events');
            break;
          case 'node:events':
            resource.request = require.resolve('events');
            break;
          case 'buffer':
            resource.request = 'buffer';
            break;
          case 'querystring':
            resource.request = require.resolve('qs');
            break;
          case 'zlib':
            resource.request = path.resolve(__dirname, 'lib/polyfills/zlib-stub.js');
            break;
          case 'util':
            resource.request = require.resolve('util');
            break;
          case 'stream':
            resource.request = path.resolve(__dirname, 'lib/polyfills/stream-stub.js');
            break;
          case 'crypto':
            resource.request = path.resolve(__dirname, 'lib/polyfills/crypto-stub.js');
            break;
          case 'url':
            resource.request = require.resolve('url');
            break;
          case 'async_hooks':
            resource.request = path.resolve(__dirname, 'lib/polyfills/async-hooks-stub.js');
            break;
          case 'string_decoder':
            return false; // Ignore these modules
          default:
            throw new Error(`No polyfill for node:${module}`);
        }
      }
    )
  ]
};