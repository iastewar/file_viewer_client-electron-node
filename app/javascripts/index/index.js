var socket = require('../socket');
var socketFunctions = require('../socket-functions');
var ipc = require('electron').ipcRenderer;
var remote = require('remote');
var loginStatus = require('../login-status');
var serverUrl = 'http://localhost:3000';

$(function() {
  var tabs = {"View": 0, "Connect": 1, "Broadcast": 2};

  $(document).on("keyup", function() {
    if (event.keyCode === 37) {
      var openTab = $(".active").find("a").html();
      var tabNumber = tabs[openTab];
      switch(tabNumber) {
        case 0:
          $("#view-tab").removeClass("active");
          $("#view").removeClass("active");
          $("#broadcast-tab").addClass("active");
          $("#broadcast").addClass("active");
          break;

        case 1:
          $("#connect-tab").removeClass("active");
          $("#connect").removeClass("active");
          $("#view-tab").addClass("active");
          $("#view").addClass("active");
          break;

        case 2:
          $("#broadcast-tab").removeClass("active");
          $("#broadcast").removeClass("active");
          $("#connect-tab").addClass("active");
          $("#connect").addClass("active");
          break;
      }
    } else if (event.keyCode === 39) {
      var openTab = $(".active").find("a").html();
      var tabNumber = tabs[openTab];
      switch(tabNumber) {
        case 0:
          $("#view-tab").removeClass("active");
          $("#view").removeClass("active");
          $("#connect-tab").addClass("active");
          $("#connect").addClass("active");
          break;

        case 1:
          $("#connect-tab").removeClass("active");
          $("#connect").removeClass("active");
          $("#broadcast-tab").addClass("active");
          $("#broadcast").addClass("active");
          break;

        case 2:
          $("#broadcast-tab").removeClass("active");
          $("#broadcast").removeClass("active");
          $("#view-tab").addClass("active");
          $("#view").addClass("active");
          break;
      }
    }
  });

  $(".loginsignup").on("click", "#login", function() {
    ipc.send('open-login-window');
    event.preventDefault();
  });

  $(".loginsignup").on("click", "#signup", function() {
    ipc.send('open-signup-window');
    event.preventDefault();
  });

  $(".loginsignup").on("click", "#logout", function() {
    $.get(serverUrl + "/logout");
    socketFunctions.resetSocket(socket);
    loginStatus.loggedin = false;
    $("#broadcastingRepos").html("");

    $(".loginsignup").html(

      "<button class='btn btn-default dropdown-toggle' type='button' id='dropdownMenu1' data-toggle='dropdown' aria-haspopup='true' aria-expanded='true'>" +
        "Log In / Sign Up <span class='caret'></span>" +
      "</button>" +
      "<ul class='dropdown-menu' aria-labelledby='dropdownMenu1'>" +
        "<li><a id='login' href='javascript:void(0);'>Log In</a></li>" +
        "<li><a id='signup' href='javascript:void(0);'>Sign Up</a></li>" +
      "</ul>"

    );
  });

});


ipc.on('loggedin', function(event, username) {
  socketFunctions.resetSocket(socket);
  loginStatus.loggedin = true;

  $(".loginsignup").html(

    "<button class='btn btn-default dropdown-toggle' type='button' id='dropdownMenu1' data-toggle='dropdown' aria-haspopup='true' aria-expanded='true'>" +
      username + " <span class='caret'></span>" +
    "</button>" +
    "<ul class='dropdown-menu' aria-labelledby='dropdownMenu1'>" +
      "<li><a id='logout' href='javascript:void(0);'>Log Out</a></li>" +
    "</ul>"

  );
});

socket.on('log in', function() {
  console.log("not logged in yet")
});
