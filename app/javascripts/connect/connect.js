var remote = require('remote');
var dialog = remote.require('dialog');
var ipc = require('electron').ipcRenderer;

var connectFolder = function(owner, name) {
  dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
    if (!directoryNames) {
      return;
    } else {

      ipc.send('connecting', {name: name, owner: owner, storingTo: directoryNames[0]});

      ipc.send('close-connect-window');
    }
  });
}

var submitConnect = function() {
  var owner = $("input[name='owner']").val();
  var name = $("input[name='name']").val();
  if (owner === "" && name === "") {

  } else if (owner === "") {
    $("#messages").html("Enter an owner.").show();
  } else if (name === "") {
    $("#messages").html("Enter a name.").show();
  } else {
    connectFolder(owner, name);
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
      ipc.send('minimize-connect-window');
    });
    $("#window-maximize-btn").on("click", function() {
      ipc.send('maximize-connect-window');
    });
    $("#window-close-btn").on("click", function() {
      ipc.send('close-connect-window');
    });
  }

  $("#submitconnect").on("click", submitConnect);

  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      submitConnect();
    }
  });

  $("#closeconnect").on("click", function() {
    ipc.send('close-connect-window');
  });
});
