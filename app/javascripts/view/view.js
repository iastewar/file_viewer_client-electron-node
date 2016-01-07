var remote = require('remote');
var dialog = remote.require('dialog');
var ipc = require('electron').ipcRenderer;

var viewFolder = function(owner, name) {
      ipc.send('viewing', {name: name, owner: owner});
      ipc.send('close-view-window');
}

var submitView = function() {
  var owner = $("input[name='owner']").val();
  var name = $("input[name='name']").val();
  if (owner === "" && name === "") {

  } else if (owner === "") {
    $("#messages").html("Enter an owner.").show();
  } else if (name === "") {
    $("#messages").html("Enter a name.").show();
  } else {
    viewFolder(owner, name);
  }
}


$(function() {

  if (process.platform === 'darwin') {
    $("#window").append(
      "<div id='window-minimize-btn' class='window-btn'>\u2500</div>" +
      "<div id='window-maximize-btn' class='window-btn'>\u25a2</div>" +
      "<div id='window-close-btn' class='window-btn'>\u2573</div>"
    );
    $("#window-minimize-btn").on("click", function() {
      ipc.send('minimize-view-window');
    });
    $("#window-maximize-btn").on("click", function() {
      ipc.send('maximize-view-window');
    });
    $("#window-close-btn").on("click", function() {
      ipc.send('close-view-window');
    });
  }

  $("#submitview").on("click", submitView);

  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      submitView();
    }
  });

  $("#closeview").on("click", function() {
    ipc.send('close-view-window');
  });
});
