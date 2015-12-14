var remote = require('remote');
var dialog = remote.require('dialog');
var ipc = require('electron').ipcRenderer;

$(function() {
  $("#submitconnect").on("click", function() {
    var owner = $("input[name='owner']").val();
    var name = $("input[name='name']").val();
    if (owner === "") {
      $("#messages").html("Enter an owner").addClass("alert alert-danger");
    } else if (name === "") {
      $("#messages").html("Enter a name").addClass("alert alert-danger");
    } else {
      connectFolder(owner, name);
    }
  });

  $("#closeconnect").on("click", function() {
    ipc.send('close-connect-window');
  });
});



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
