var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var serverUrl = 'http://localhost:3000';
var socket = io(serverUrl);
var helpers = require('./helpers');

$(function() {

  $("#listenFolder").on("click", function() {
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
  });

  $("#stopListening").on("click", function() {
    if (helpers.watcher) {
      helpers.watcher.close();
      helpers.watcher = null;
      helpers.gitignore = null;
      helpers.sendDirectoryCount = 0;
      $("#log").append("<div>Stopped listening to folder</div>");
    }
  });

  $("#connectFolder").on("click", function() {
    dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
      if (!directoryNames) {
        return;
      } else {
        serverFolder = $("#serverFolder").val();;
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
  });

  $("#disconnectFolder").on("click", function() {
    if (helpers.connectedDirectory && helpers.serverDirectory) {
      socket.emit('disconnect folder', helpers.serverDirectory);
      $("#log").append("<div>Disconnected from: " + helpers.serverDirectory +  ", stopped storing to " + connectedDirectory + "</div>");
      helpers.connectedDirectory = null;
      helpers.serverDirectory = null;
    }
  });

  socket.on('send file', function(msg) {
    //$('#file').text(msg.fileName);
    if (!helpers.connectedDirectory) {
      console.log("Error! Received an unknown file")
    } else {
      // else write file to the connected directory.
      // get directory of file to be saved
      var dirFileArray = msg.fileName.split("/");
      var directory = helpers.connectedDirectory;
      for (var i = 0; i < dirFileArray.length - 1; i++) {
        directory = directory + '/' + dirFileArray[i];
      }

      // try to create the directory
      fs.mkdir(directory, function(err) {
        // if file should be deleted, delete it
        if (msg.deleted) {
          fs.stat(helpers.connectedDirectory + '/' + msg.fileName, function(err, stats) {
          if (!stats) {
            return;
          }
          if (stats.isFile()) {
            fs.unlink(helpers.connectedDirectory + '/' + msg.fileName, function(err) {
              if (err) {
                return console.log(err);
              }
            });
          } else {
            helpers.rmdirAsync(helpers.connectedDirectory + '/' + msg.fileName);
          }
        });
        // otherwise, save the file
        } else {
          fs.writeFile(helpers.connectedDirectory + '/' + msg.fileName, helpers.toBuffer(msg.fileContents), function(err) {
              if(err) {
                  return console.log(err);
              }

              console.log("The file was saved!");
          });
        }
      });
    }
  });

  socket.on('send directory error', function() {
    helpers.connectedDirectory = null;
    helpers.serverDirectory = null;
    $("#log").append("<div>Problem retrieving directory. Either folder does not exist, or the server is experiencing problems</div>");
  });



});
