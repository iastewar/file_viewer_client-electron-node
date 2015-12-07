var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');

var serverUrl = 'http://localhost:3000';
var socket = io(serverUrl);

var watcher;
var connectedDirectory;
var serverDirectory;

// converts an ArrayBuffer to a Buffer
var toBuffer = function(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

// sends a file to the server where directoryName/fileName is the path of the file,
// and data is the content of the file
var sendFileToServer = function(directoryName, fileName, data) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length-1];
  socket.emit('send file', {fileName: currentDir + '/' + fileName, fileContents: data});

}

// deletes a file from the server where directoryName/fileName is the path of the file,
var deleteFileFromServer = function(directoryName, fileName) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length - 1];
  socket.emit('send file', {fileName: currentDir + '/' + fileName, deleted: true});
}

var sendDirectory = function(directoryName, subDirectories) {
  fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {
    if (err) throw err;
    // fileName could be a file or a directory
    fileNames.forEach(function(fileName){
      fs.readFile(directoryName + '/' + subDirectories + '/' + fileName, function(err, data) {
        var subDirs;
        if (subDirectories === "") {
          subDirs = fileName;
        } else {
          subDirs = subDirectories + '/' + fileName;
        }
        // if error must be a directory
        if (err) {
          sendDirectory(directoryName, subDirs);
        } else {
          // send to server
          sendFileToServer(directoryName, subDirs, data);
        }
      });
    });
  });
}

$(function() {

  $("#listenFolder").on("click", function() {
    if (watcher) {
      watcher.close();
      watcher = null;
      $("#log").append("<div>Stopped listening to folder</div>");
    }

    dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
      if (!directoryNames) {
        return;
      } else {
        $("#log").append("<div>Listening to " + directoryNames[0] + "</div>");

        sendDirectory(directoryNames[0], "");

        watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, function(event, fileName) {
          fs.readFile(directoryNames[0] + '/' + fileName, function(err, data) {
            if (err) {
              // delete from server
              deleteFileFromServer(directoryNames[0], fileName);
            } else {
              // send to server
              sendFileToServer(directoryNames[0], fileName, data);
            }
          });
        });
      }
    });
  });

  $("#stopListening").on("click", function() {
    if (watcher) {
      watcher.close();
      watcher = null;
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

        connectedDirectory = directoryNames[0];
        serverDirectory = serverFolder;

        socket.emit('connect folder', serverFolder);

        $("#log").append("<div>Connected to: " + serverFolder + ", storing to " + directoryNames[0] + "</div>");

      }
    });
  });

  $("#disconnectFolder").on("click", function() {
    if (connectedDirectory && serverDirectory) {
      socket.emit('disconnect folder', serverDirectory);
      $("#log").append("<div>Disconnected from: " + serverDirectory +  ", stopped storing to " + connectedDirectory + "</div>");
      connectedDirectory = null;
      serverDirectory = null;
    }
  });

  socket.on('send file', function(msg) {
    //$('#file').text(msg.fileName);
    if (!connectedDirectory) {
      console.log("Error! Received an unknown file")
    } else {
      // else write file to the connected directory.
      // get directory of file to be saved
      var dirFileArray = msg.fileName.split("/");
      var directory = connectedDirectory;
      for (var i = 0; i < dirFileArray.length - 1; i++) {
        directory = directory + '/' + dirFileArray[i];
      }

      // try to create the directory
      fs.mkdir(directory, function(err) {
        // if file should be deleted, delete it
        if (msg.deleted) {
          fs.unlink(connectedDirectory + '/' + msg.fileName, function(err) {
            if (err) {
              return console.log(err);
            }
          });
        // otherwise, save the file
        } else {
          fs.writeFile(connectedDirectory + '/' + msg.fileName, toBuffer(msg.fileContents), function(err) {
              if(err) {
                  return console.log(err);
              }

              console.log("The file was saved!");
          });
        }
      });
    }
  });

  socket.on('folder does not exist', function() {
    connectedDirectory = null;
    serverDirectory = null;
    ("#log").append("<div>Folder does not exit</div>");
  });



});
