var serverUrl = 'http://localhost:3000';
var cookie = require('./cookie');

var socket = io.connect(serverUrl, {
  query: 'session_id=' + cookie.getCookie('file.view-sid-key')
});
module.exports = socket;
