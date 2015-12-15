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
  if (owner === "") {
    $("#messages").html("Enter an owner").show();
  } else if (name === "") {
    $("#messages").html("Enter a name").show();
  } else {
    viewFolder(owner, name);
  }
}


$(function() {

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
