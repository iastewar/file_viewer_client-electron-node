var remote = require('remote');
var dialog = remote.require('dialog');
var ipc = require('electron').ipcRenderer;
var socketFunctions = require('../socket-functions');

if (!socketFunctions.socket) {
  socketFunctions.connect(socket);
}
var socket = socketFunctions.socket;

var showing;
var userFolders = {};

var viewFolder = function(owner, name) {
      ipc.send('viewing', {name: name, owner: owner});
      ipc.send('close-view-window');
}

// var submitView = function() {
//   var owner = $("input[name='owner']").val();
//   var name = $("input[name='name']").val();
//   if (owner === "" && name === "") {
//
//   } else if (owner === "") {
//     $("#messages").html("Enter an owner.").show();
//   } else if (name === "") {
//     $("#messages").html("Enter a name.").show();
//   } else {
//     viewFolder(owner, name);
//   }
// }

var show = function() {
  var owner = $("input[name='owner']").val();
  if (owner === "") return;
  $("#form-container").hide();
  $("#show-container").show();
  socket.emit('show user folders', owner);
  showing = owner;
}

$(function() {

  if (process.platform !== 'darwin') {
    $("#window").append(
      "<div id='window-minimize-btn' class='window-btn'>\u2500</div>" +
      "<div id='window-maximize-cont'><div id='window-maximize-btn' class='window-btn'><div></div></div></div>" +
      "<div id='window-close-btn' class='window-btn'>\u2573</div>"
    );
    $("#window-minimize-btn").on("click", function() {
      ipc.send('minimize-view-window');
    });
    $("#window-maximize-cont").on("click", "#window-maximize-btn", function() {
      ipc.send('maximize-view-window');
      $("#window-maximize-cont").html("<div id='window-restore-btn' class='window-btn'><div></div><div></div></div>");
    });
    $("#window-maximize-cont").on("click", "#window-restore-btn", function() {
      ipc.send('restore-view-window');
      $("#window-maximize-cont").html("<div id='window-maximize-btn' class='window-btn'><div></div></div>");
    });
    $("#window-close-btn").on("click", function() {
      ipc.send('close-view-window');
    });
  }

  // $("#submitview").on("click", submitView);

  $("#show").on("click", show);

  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      if (!showing) show();
    }
  });

  $("#closeview").on("click", function() {
    ipc.send('close-view-window');
  });
});

socket.on('user folder', function(msg) {
  if (msg.owner !== showing) {
    console.log("recieved an unknown user folder name");
  } else {
    userFolders[msg.name] = true;
    $("#show-container").append("<div>" + msg.name + "</div>");
  }
});
