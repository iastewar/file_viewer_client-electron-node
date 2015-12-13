var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var socket = require('../socket');
var helpers = require('./helpers');

var events = {};

events.listenFolder = function() {
  if (helpers.watchers) {
    helpers.watchers.close();
    helpers.watchers = null;
    helpers.gitignores = null;
    helpers.sendDirectoryCount = 0;
    $("#log").append("<div>Stopped listening to folder</div>");
  }

  dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
    if (!directoryNames) {
      return;
    } else {
      $("#log").append("<div>Listening to " + directoryNames[0] + "</div>");

      helpers.sendDirectory(directoryNames[0], "");

      helpers.watchers = fs.watch(directoryNames[0], { persistent: true, recursive: true }, function(event, fileName) {
        fs.stat(directoryNames[0] + '/' + fileName, function(err, stats) {
          if (helpers.gitignores && helpers.gitignores.denies(fileName)) {
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
  if (helpers.watchers) {
    helpers.watchers.close();
    helpers.watchers = null;
    helpers.gitignores = null;
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

      helpers.connectedDirectories = directoryNames[0];
      helpers.serverDirectories = serverFolder;

      socket.emit('connect folder', serverFolder);

      $("#log").append("<div>Connected to: " + serverFolder + ", storing to " + directoryNames[0] + "</div>");

    }
  });
}

events.disconnectFolder = function() {
  if (helpers.connectedDirectories && helpers.serverDirectories) {
    socket.emit('disconnect folder', helpers.serverDirectories);
    $("#log").append("<div>Disconnected from: " + helpers.serverDirectories +  ", stopped storing to " + helpers.connectedDirectories + "</div>");
    helpers.connectedDirectories = null;
    helpers.serverDirectories = null;
  }
}

module.exports = events;
