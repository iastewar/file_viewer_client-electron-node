var serverURL = require('./serverURL');

var socketFunctions = {};

socketFunctions.socket = null;

socketFunctions.resetSocket = function() {
  socketFunctions.socket.disconnect();
  socketFunctions.socket.connect(serverURL);
}

socketFunctions.connect = function() {
  socketFunctions.socket = io.connect(serverURL);
}

module.exports = socketFunctions;
