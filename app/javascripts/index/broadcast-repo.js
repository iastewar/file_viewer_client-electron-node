var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var socket = require('../socket');
var helpers = require('./helpers');
var ipc = require('electron').ipcRenderer;
var loginStatus = require('../login-status');


var addRow = function(directoryName) {
  $("#broadcastingRepos").append(
  "<tr>" +
    "<td class='broadcastName'>" + directoryName + "</td>" +
    "<td><div class='btn btn-danger stopBroadcasting'>Stop</div></td>" +
  "</tr>"

  );
}


var broadcastRepo = function() {
  dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
    if (!directoryNames) {
      return;
    } else {
      console.log("Listening to " + directoryNames[0]);

      helpers.broadcastingRepos[directoryNames[0]] = {sentDirectory: false};

      helpers.sendDirectory(directoryNames[0], "");

      addRow(directoryNames[0]);


      helpers.broadcastingRepos[directoryNames[0]].watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, function(event, fileName) {
        fs.stat(directoryNames[0] + '/' + fileName, function(err, stats) {
          if (helpers.broadcastingRepos[directoryNames[0]].gitignore && helpers.broadcastingRepos[directoryNames[0]].gitignore.denies(fileName)) {
            console.log("denied " + fileName);
            return;
          }
          if (err) {
            // nonexistent so delete from server
            helpers.deleteFileFromServer(directoryNames[0], fileName);
          } else if (stats.isFile() && stats.size > 16777216) {
            console.log("Error, " + fileName + " is over 16MB and can't be sent");
          } else {
            // send to server
            if (stats.isFile()) {
              fs.readFile(directoryNames[0] + '/' + fileName, function(err, data) {
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

    var arr = broadcastName.split("/");

    console.log('deleting folder from server: ' + arr[arr.length - 1]);

    socket.emit('delete folder', arr[arr.length - 1]);

    $(this).parent().parent().remove();
  })
})
