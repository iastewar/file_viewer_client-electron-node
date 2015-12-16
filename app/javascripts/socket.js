var serverURL = require('./serverURL');
var cookie = require('./cookie');

var socket = io.connect(serverURL, {
  query: 'session_id=' + cookie.getCookie('file.view-sid-key')
});
module.exports = socket;
