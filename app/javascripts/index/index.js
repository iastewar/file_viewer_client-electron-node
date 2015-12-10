require('electron-cookies')
var buttons = require('./button-events');
var socketInputs = require('./socket-inputs');
var socket = require('../socket');
var socketFunctions = require('../socket-functions')

$(function() {

  $("#login").submit(function(e)
  {
      var postData = $(this).serializeArray();
      var formURL = $(this).attr("action");
      $.ajax(
      {
          url : formURL,
          type: "POST",
          data : postData,
          dataType: "json",
          success: function(data, textStatus, xhr) {
            if (data.user) {
              $('#log').append("<div>Logged in as " + data.user.username + "</div>");
              socketFunctions.resetSocket(socket);
            } else {
              $('#log').append("<div>Login Failed</div>");
            }

          },
          error: function(jqXHR, textStatus, errorThrown) {
              console.log("failed to send the login request");
          }
      });
      e.preventDefault(); //STOP default action
  });


  $("#submitlogin").on("click", function() {
    $("#login").submit();

    //var win = new BrowserWindow({ width: 800, height: 600 });
    //win.loadURL(serverUrl + '/users/login');
  })


  $("#listenFolder").on("click", buttons.listenFolder);

  $("#stopListening").on("click", buttons.stopListening);

  $("#connectFolder").on("click", buttons.connectFolder);

  $("#disconnectFolder").on("click", buttons.disconnectFolder);

  socket.on('send file', socketInputs.sendFile);

  socket.on('send directory error', socketInputs.sendDirectoryError);

  socket.on('log in', function() {
    console.log("not logged in yet")
  })
});
