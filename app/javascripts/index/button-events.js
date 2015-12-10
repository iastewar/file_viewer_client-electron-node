var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var socket = require('../socket');
var helpers = require('./helpers');

var events = {};

events.listenFolder = function() {
  if (helpers.watcher) {
    helpers.watcher.close();
    helpers.watcher = null;
    helpers.gitignore = null;
    helpers.sendDirectoryCount = 0;
    $("#log").append("<div>Stopped listening to folder</div>");
  }

  dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
    if (!directoryNames) {
      return;
    } else {
      $("#log").append("<div>Listening to " + directoryNames[0] + "</div>");

      helpers.sendDirectory(directoryNames[0], "");

      helpers.watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, function(event, fileName) {
        fs.stat(directoryNames[0] + '/' + fileName, function(err, stats) {
          if (helpers.gitignore && helpers.gitignore.denies(fileName)) {
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

events.stopListening = function() {
  if (helpers.watcher) {
    helpers.watcher.close();
    helpers.watcher = null;
    helpers.gitignore = null;
    helpers.sendDirectoryCount = 0;
    socket.emit('delete folder');
    $("#log").append("<div>Stopped listening to folder</div>");
  }
}

events.connectFolder = function() {
  dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
    if (!directoryNames) {
      return;
    } else {
      serverFolder = $("#serverFolder").val();
      if (serverFolder === "") {
        $("#log").append("<div>Please enter a server folder first</div>");
        return;
      }

      helpers.connectedDirectory = directoryNames[0];
      helpers.serverDirectory = serverFolder;

      socket.emit('connect folder', serverFolder);

      $("#log").append("<div>Connected to: " + serverFolder + ", storing to " + directoryNames[0] + "</div>");

    }
  });
}

events.disconnectFolder = function() {
  if (helpers.connectedDirectory && helpers.serverDirectory) {
    socket.emit('disconnect folder', helpers.serverDirectory);
    $("#log").append("<div>Disconnected from: " + helpers.serverDirectory +  ", stopped storing to " + helpers.connectedDirectory + "</div>");
    helpers.connectedDirectory = null;
    helpers.serverDirectory = null;
  }
}

module.exports = events;
