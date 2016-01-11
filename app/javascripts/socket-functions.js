var serverURL = require('./serverURL');
var cookie = require('./cookie');

var socketFunctions = {};

socketFunctions.socket = null;

socketFunctions.resetSocket = function() {
  socketFunctions.socket.disconnect();
  socketFunctions.socket.connect(serverURL, {'force new connection': true,
                 query: 'session_id=' + cookie.getCookie('file.view-sid-key')});
}

socketFunctions.connect = function() {
  socketFunctions.socket = io.connect(serverURL, {
    query: 'session_id=' + cookie.getCookie('file.view-sid-key')
  });
}

module.exports = socketFunctions;
