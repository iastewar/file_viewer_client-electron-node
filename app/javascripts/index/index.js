var socket = require('../socket');
var socketFunctions = require('../socket-functions');
var ipc = require('electron').ipcRenderer;
var remote = require('remote');
var loginStatus = require('../login-status');
var serverUrl = 'http://localhost:3000';

$(function() {
  $(".loginsignup").on("click", "#login", function() {
    ipc.send('open-login-window');
    event.preventDefault();
  })

  $(".loginsignup").on("click", "#signup", function() {
    ipc.send('open-signup-window');
    event.preventDefault();
  })

  $(".loginsignup").on("click", "#logout", function() {
    $.get(serverUrl + "/users/logout");
    socketFunctions.resetSocket(socket);
    $("#signinMessage").html("Not Signed In");
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

  })

  ipc.on('loggedin', function(event, username) {
    socketFunctions.resetSocket(socket);
    $("#signinMessage").html("Signed in as " + username);
    loginStatus.loggedin = true;

    $(".loginsignup").html(

      "<button id='logout' class='btn btn-default'>" +
        "Log Out" +
      "</button>"

    );
  });

  socket.on('log in', function() {
    console.log("not logged in yet")
  })

})
