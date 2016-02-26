module.exports = function(maxFileSize, version) {

var serverURL = require('../serverURL');
var socketFunctions = require('../socket-functions');
var ipc = require('electron').ipcRenderer;
var helpers = require('./helpers');
var viewRepo = require('./view-repo');
var connectRepo = require('./connect-repo');
var broadcastRepo = require('./broadcast-repo');

helpers.maxFileSize = maxFileSize;

socketFunctions.connect();
helpers.socket = socketFunctions.socket;

// separator is "/" for mac and linux, and "\\" for windows
helpers.separator = "/";
if (process.platform === 'win32') {
  helpers.separator = "\\"
}

broadcastRepo(helpers);
connectRepo(helpers);
viewRepo(helpers);

$(function() {

  $("#version-number").html(version);

  // create borderless window for windows and linux
  if (process.platform !== 'darwin') {
    $("#window").append(
      "<div id='window-minimize-btn' class='window-btn'>\u2500</div>" +
      "<div id='window-maximize-cont'><div id='window-maximize-btn' class='window-btn'><div></div></div></div>" +
      "<div id='window-close-btn' class='window-btn'>\u2573</div>"
    );
    $("#window-minimize-btn").on("click", function() {
      ipc.send('minimize-main-window');
    });
    $("#window-maximize-cont").on("click", "#window-maximize-btn", function() {
      ipc.send('maximize-main-window');
      $("#window-maximize-cont").html("<div id='window-restore-btn' class='window-btn'><div></div><div></div></div>");
    });
    $("#window-maximize-cont").on("click", "#window-restore-btn", function() {
      ipc.send('restore-main-window');
      $("#window-maximize-cont").html("<div id='window-maximize-btn' class='window-btn'><div></div></div>");
    });
    $("#window-close-btn").on("click", function() {
      ipc.send('close-main-window');
    });
  }

  // toggle tabs with 'a' and 'd' keys
  // $(document).on("keydown", function() {
  //   if (event.keyCode === 65) {
  //     var openTab = $(".active").find("a").html();
  //     switch(openTab) {
  //       case "View":
  //         $("#view-tab").removeClass("active");
  //         $("#view").removeClass("active");
  //         $("#broadcast-tab").addClass("active");
  //         $("#broadcast").addClass("active");
  //         break;
  //
  //       case "Connect":
  //         $("#connect-tab").removeClass("active");
  //         $("#connect").removeClass("active");
  //         $("#view-tab").addClass("active");
  //         $("#view").addClass("active");
  //         break;
  //
  //       case "Broadcast":
  //         $("#broadcast-tab").removeClass("active");
  //         $("#broadcast").removeClass("active");
  //         $("#connect-tab").addClass("active");
  //         $("#connect").addClass("active");
  //         break;
  //     }
  //   } else if (event.keyCode === 68) {
  //     var openTab = $(".active").find("a").html();
  //     switch(openTab) {
  //       case "View":
  //         $("#view-tab").removeClass("active");
  //         $("#view").removeClass("active");
  //         $("#connect-tab").addClass("active");
  //         $("#connect").addClass("active");
  //         break;
  //
  //       case "Connect":
  //         $("#connect-tab").removeClass("active");
  //         $("#connect").removeClass("active");
  //         $("#broadcast-tab").addClass("active");
  //         $("#broadcast").addClass("active");
  //         break;
  //
  //       case "Broadcast":
  //         $("#broadcast-tab").removeClass("active");
  //         $("#broadcast").removeClass("active");
  //         $("#view-tab").addClass("active");
  //         $("#view").addClass("active");
  //         break;
  //     }
  //   }
  // });

  // prevent pressing enter from reloading page on input fields
  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      event.preventDefault();
      return false;
    }
  });

  $("#view-tab").on("click", function() {
    $("#connect-form-container").hide();
    $("#view-form-container").show();
    if ($("#view-form").attr("data") === "showing") {
      $("#forms-container").show();
      $("#view-form input[name='owner']").focus();
      $("#main-container").css("opacity", "0.3");
      $("#empty-container").css("z-index", "50");
    } else {
      $("#forms-container").hide();
      $("#main-container").css("opacity", "1");
      $("#empty-container").css("z-index", "-50");
    }
  });

  $("#connect-tab").on("click", function() {
    $("#view-form-container").hide();
    $("#connect-form-container").show();
    if ($("#connect-form").attr("data") === "showing") {
      $("#forms-container").show();
      $("#connect-form input[name='owner']").focus();
      $("#main-container").css("opacity", "0.3");
      $("#empty-container").css("z-index", "50");
    } else {
      $("#forms-container").hide();
      $("#main-container").css("opacity", "1");
      $("#empty-container").css("z-index", "-50");
    }
  });

  $("#broadcast-tab").on("click", function() {
    $("#forms-container").hide();
    $("#main-container").css("opacity", "1");
    $("#empty-container").css("z-index", "-50");
  });

  $("#empty-container").on("click", function() {
      $("#forms-container").hide();
      if ($(".active").find("a").html() === "View") {
        $("#view-form").attr("data", "hidden");
      } else if ($(".active").find("a").html() === "Connect") {
        $("#connect-form").attr("data", "hidden");
      }
      $("#main-container").css("opacity", "1");
      $(this).css("z-index", "-50");
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
    socketFunctions.resetSocket();
    helpers.loggedIn = false;

    $("#broadcastingRepos").html("");
    $("#broadcastingReposHead").html("");
    helpers.numBroadcastingRepos = 0;
    $("#broadcast-help").show();

    $(".loginsignup").html(

      "<button class='btn btn-default dropdown-toggle' type='button' id='dropdownMenu1' data-toggle='dropdown' aria-haspopup='true' aria-expanded='true'>" +
        "Log In / Sign Up <span class='caret'></span>" +
      "</button>" +
      "<ul class='dropdown-menu' aria-labelledby='dropdownMenu1'>" +
        "<li><a id='login' href='javascript:void(0);'>Log In</a></li>" +
        "<li><a id='signup' href='javascript:void(0);'>Sign Up</a></li>" +
      "</ul>"

    );

    $("#broadcast-stats-files").html("0");
    $("#broadcast-stats-size").html("0.00");
  });

});


ipc.on('loggedin', function(event, username) {
  socketFunctions.resetSocket();
  helpers.loggedIn = true;

  $(".loginsignup").html(

    "<button class='btn btn-default dropdown-toggle' type='button' id='dropdownMenu1' data-toggle='dropdown' aria-haspopup='true' aria-expanded='true'>" +
      username + " <span class='caret'></span>" +
    "</button>" +
    "<ul class='dropdown-menu' aria-labelledby='dropdownMenu1'>" +
      "<li><a id='logout' href='javascript:void(0);'>Log Out</a></li>" +
    "</ul>"

  );
});

helpers.socket.on('log in', function() {
  for (var key in helpers.broadcastingRepos) {
    if (helpers.broadcastingRepos.hasOwnProperty(key)) {
      if (helpers.broadcastingRepos[key].watcher) {
        helpers.broadcastingRepos[key].watcher.close();
      }
    }
  }
  helpers.broadcastingRepos = {};

  helpers.loggedIn = false;

  $("#broadcastingRepos").html("");
  $("#broadcastingReposHead").html("");
  helpers.numBroadcastingRepos = 0;
  $("#broadcast-help").show();

  $(".loginsignup").html(

    "<button class='btn btn-default dropdown-toggle' type='button' id='dropdownMenu1' data-toggle='dropdown' aria-haspopup='true' aria-expanded='true'>" +
      "Log In / Sign Up <span class='caret'></span>" +
    "</button>" +
    "<ul class='dropdown-menu' aria-labelledby='dropdownMenu1'>" +
      "<li><a id='login' href='javascript:void(0);'>Log In</a></li>" +
      "<li><a id='signup' href='javascript:void(0);'>Sign Up</a></li>" +
    "</ul>"

  );

  $("#broadcast-stats-files").html("0");
  $("#broadcast-stats-size").html("0.00");
});

helpers.socket.on('is logged in', function(username) {
  helpers.loggedIn = true;

  $(".loginsignup").html(

    "<button class='btn btn-default dropdown-toggle' type='button' id='dropdownMenu1' data-toggle='dropdown' aria-haspopup='true' aria-expanded='true'>" +
      username + " <span class='caret'></span>" +
    "</button>" +
    "<ul class='dropdown-menu' aria-labelledby='dropdownMenu1'>" +
      "<li><a id='logout' href='javascript:void(0);'>Log Out</a></li>" +
    "</ul>"

  );
});

helpers.socket.on('client version', function(msg) {
  if (msg !== version) {
    $("#new-version-number").html(msg);
    $("#new-version").show();
  }
});

}
