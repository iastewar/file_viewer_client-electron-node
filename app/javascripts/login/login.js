var socket = require('../socket');
var socketFunctions = require('../socket-functions')
var ipc = require('electron').ipcRenderer;
var remote = require('remote');

$(function() {
  $("#closelogin").on("click", function() {
    ipc.send('close-login-window');
    event.preventDefault();
  })

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
              ipc.send('loggedin', data.user.username);
              ipc.send('close-login-window');
              socketFunctions.resetSocket(socket);
            } else {
              $("#messages").html("Invalid username or password").addClass("alert alert-danger");
            }

          },
          error: function(jqXHR, textStatus, errorThrown) {
              console.log("failed to send the login request");
          }
      });
      e.preventDefault();
  });


  $("#submitlogin").on("click", function() {
    $("#login").submit();
    event.preventDefault();
  })
});
