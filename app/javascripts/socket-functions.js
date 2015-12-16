var serverURL = require('./serverURL');
var cookie = require('./cookie');

var socketFunctions = {};

socketFunctions.resetSocket = function(socket) {
  socket.disconnect();
  socket.connect(serverURL, {'force new connection': true,
                 query: 'session_id=' + cookie.getCookie('file.view-sid-key')});
}

module.exports = socketFunctions;
