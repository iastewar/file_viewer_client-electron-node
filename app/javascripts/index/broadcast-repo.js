var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var socket = require('../socket');
var helpers = require('./helpers');
var ipc = require('electron').ipcRenderer;
var loginStatus = require('../login-status');

// seperator is "/" for mac and linux, and "\\" for windows
var seperator = "/";

var maxFileSize = 5242880;

var numRepos = 0;

var addRow = function(directoryName) {
  $("#broadcastingRepos").append(
  "<tr>" +
    "<td class='broadcastName' width='80%'>" + directoryName + "</td>" +
    "<td width='20%'><div class='btn btn-danger stopBroadcasting'><span class='fa fa-stop'>&nbsp;&nbsp;Stop</span></div></td>" +
  "</tr>"

  );
}

var addHeader = function() {
  $("#broadcastingReposHead").append(
    "<tr>" +
      "<th width='80%'>Name</th>" +
      "<th width='20%'>Stop Broadcasting?</th>" +
    "</tr>"
  );
}

var removeHeader = function() {
  $("#broadcastingReposHead").html("");
}


var broadcastRepo = function() {
  dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
    if (!directoryNames) {
      return;
    } else {
      if (helpers.broadcastingRepos[directoryNames[0]]) {
        $("#broadcast-messages").html(
          "<div class='alert alert-danger'>" +
          "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
          "The repository " + directoryNames[0] + " is already being broadcasted" +
          "</div>"
        );
      } else {
        console.log("Listening to " + directoryNames[0]);

        helpers.broadcastingRepos[directoryNames[0]] = {sentDirectory: false};

        helpers.sendDirectory(directoryNames[0], "");

        if (numRepos === 0)
          addHeader();
        numRepos++;

        addRow(directoryNames[0]);

        helpers.broadcastingRepos[directoryNames[0]].watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, function(event, fileName) {
          fs.stat(directoryNames[0] + seperator + fileName, function(err, stats) {
            if (helpers.broadcastingRepos[directoryNames[0]].gitignore && helpers.broadcastingRepos[directoryNames[0]].gitignore.denies(fileName)) {
              console.log("denied " + fileName);
              return;
            }
            if (err) {
              // nonexistent so delete from server
              helpers.deleteFileFromServer(directoryNames[0], fileName);
            } else if (stats.isFile() && stats.size > maxFileSize) {
              $("#broadcast-messages").html(
                "<div class='alert alert-danger'>" +
                "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
                fileName + " is over 5MB and can't be sent." +
                "</div>"
              );
            } else {
              // send to server
              if (stats.isFile()) {
                fs.readFile(directoryNames[0] + seperator + fileName, function(err, data) {
                  if (err) {
                    console.log(err);
                  }
                  helpers.sendFileToServer(directoryNames[0], fileName, data);
                });
              } else {
                helpers.sendDirectory(directoryNames[0], fileName);
              }
            }
          });
        });
      }
    }
  });
}

var broadcastBtn = function() {
  if (loginStatus.loggedin) {
    broadcastRepo();
  } else {
    ipc.send('open-login-window');
  }
}

$(function() {
  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      if ($(".active").find("a").html() === "Broadcast") {
        broadcastBtn();
      }
    }
  });

  $("#broadcast-btn").on("click", broadcastBtn);

  $("#broadcastingRepos").on("click", ".stopBroadcasting", function() {
    var broadcastName = $(this).parent().parent().find(".broadcastName").html()

    if (helpers.broadcastingRepos[broadcastName]) {
      if (helpers.broadcastingRepos[broadcastName].watcher) {
        helpers.broadcastingRepos[broadcastName].watcher.close();
      }
      delete helpers.broadcastingRepos[broadcastName];
    }

    var arr = broadcastName.split(seperator);

    console.log('deleting folder from server: ' + arr[arr.length - 1]);

    socket.emit('delete folder', arr[arr.length - 1]);

    $(this).parent().parent().remove();

    if (numRepos === 1)
      removeHeader();
    numRepos--;
  })
})

socket.on('max files allowed', function(msg) {
  $("#broadcast-messages").html(
    "<div class='alert alert-danger'>" +
    "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
    "You have reached the maximum file limit of " + msg + " files. One or more files were not saved on the server." +
    "</div>"
  );
});
