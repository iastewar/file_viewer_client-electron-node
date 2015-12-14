var webpack = require('webpack');
module.exports = {
  entry: {
  app: ['webpack/hot/dev-server', './app/javascripts/entry.js'],
},
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
   new webpack.HotModuleReplacementPlugin(), new webpack.IgnorePlugin(new RegExp("^(fs|ipc|remote)$"))
 ]
}
