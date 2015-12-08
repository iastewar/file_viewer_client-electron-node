var serverUrl = 'http://localhost:3000';
var socket = io(serverUrl);
var buttons = require('./button-events');
var socketInputs = require('./socket-inputs');

$(function() {

  $("#listenFolder").on("click", buttons.listenFolder);

  $("#stopListening").on("click", buttons.stopListening);

  $("#connectFolder").on("click", buttons.connectFolder);

  $("#disconnectFolder").on("click", buttons.disconnectFolder);

  socket.on('send file', socketInputs.sendFile);

  socket.on('send directory error', socketInputs.sendDirectoryError);

});
