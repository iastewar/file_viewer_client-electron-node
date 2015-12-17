var webpack = require('webpack');
var webpackTargetElectronRenderer = require('webpack-target-electron-renderer');
options = {
  entry: {
  app: ['webpack/hot/dev-server', './app/javascripts/entry.js'],
},
target: "atom",
output: {
  path: './app/built',
  filename: 'bundle.js',
  publicPath: 'http://localhost:8080/built/'
},
devServer: {
  contentBase: './public',
  publicPath: 'http://localhost:8080/built/'
},
module: {
 loaders: [
   { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/, query: {presets:['react']} },
 ]
},
 plugins: [
   new webpack.HotModuleReplacementPlugin()
 ]
}

options.target = webpackTargetElectronRenderer(options)

module.exports = options;
