var webpack = require('webpack');
var webpackTargetElectronRenderer = require('webpack-target-electron-renderer');
options = {
  entry: {
  app: './app/javascripts/entry.js',
},
target: "atom",
output: {
  path: './app/javascripts/built',
  filename: 'bundle.js'
},
module: {
 loaders: [
   { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/, query: {presets:['react']} },
 ]
},
 plugins: [
   new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': '"production"'
    }
  })
 ]
}

options.target = webpackTargetElectronRenderer(options)

module.exports = options;
