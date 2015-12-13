var socket = require('../socket');
var socketFunctions = require('../socket-functions')
var ipc = require('electron').ipcRenderer;
var remote = require('remote');

$(function(){
  $("#login").on("click", function() {
    ipc.send('open-login-window');
    event.preventDefault();
  })

  ipc.on('loggedin', function(event, username) {
    $("#signinMessage").html("Signed in as " + username);
  });

})
