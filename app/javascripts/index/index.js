var socket = require('../socket');
var socketFunctions = require('../socket-functions');
var ipc = require('electron').ipcRenderer;
var remote = require('remote');
var loginStatus = require('../login-status');
var serverURL = require('../serverURL');
var helpers = require('./helpers');

$(function() {

  if (process.platform !== 'darwin') {
    $("#window").append(
      "<div id='window-minimize-btn' class='window-btn'>\u2500</div>" +
      "<div id='window-maximize-btn' class='window-btn'>\u25a2</div>" +
      "<div id='window-close-btn' class='window-btn'>\u2573</div>"
    );
    $("#window-minimize-btn").on("click", function() {
      ipc.send('minimize-main-window');
    });
    $("#window-maximize-btn").on("click", function() {
      ipc.send('maximize-main-window');
    });
    $("#window-close-btn").on("click", function() {
      ipc.send('close-main-window');
    });
  }

  // toggle tabs with 'a' and 'd' keys
  $(document).on("keydown", function() {
    if (event.keyCode === 65) {
      var openTab = $(".active").find("a").html();
      switch(openTab) {
        case "View":
          $("#view-tab").removeClass("active");
          $("#view").removeClass("active");
          $("#broadcast-tab").addClass("active");
          $("#broadcast").addClass("active");
          break;

        case "Connect":
          $("#connect-tab").removeClass("active");
          $("#connect").removeClass("active");
          $("#view-tab").addClass("active");
          $("#view").addClass("active");
          break;

        case "Broadcast":
          $("#broadcast-tab").removeClass("active");
          $("#broadcast").removeClass("active");
          $("#connect-tab").addClass("active");
          $("#connect").addClass("active");
          break;
      }
    } else if (event.keyCode === 68) {
      var openTab = $(".active").find("a").html();
      switch(openTab) {
        case "View":
          $("#view-tab").removeClass("active");
          $("#view").removeClass("active");
          $("#connect-tab").addClass("active");
          $("#connect").addClass("active");
          break;

        case "Connect":
          $("#connect-tab").removeClass("active");
          $("#connect").removeClass("active");
          $("#broadcast-tab").addClass("active");
          $("#broadcast").addClass("active");
          break;

        case "Broadcast":
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
    for (var key in helpers.broadcastingRepos) {
      if (helpers.broadcastingRepos.hasOwnProperty(key)) {
        if (helpers.broadcastingRepos[key].watcher) {
          helpers.broadcastingRepos[key].watcher.close();
        }
      }
    }
    helpers.broadcastingRepos = {};

    $.get(serverURL + "/logout");
    socketFunctions.resetSocket(socket);
    loginStatus.loggedin = false;

    $("#broadcastingRepos").html("");
    $("#broadcastingReposHead").html("");

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
