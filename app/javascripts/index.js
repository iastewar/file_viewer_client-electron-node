var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');

var serverUrl = 'http://localhost:3000';
var socket = io(serverUrl);

var watcher;

// ask the server to be assigned to a room. This way only clients in the same room
// will be able to receive file changes.
var requestRoom = function(directoryName) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length-1]
  socket.emit('request room', currentDir);
}

// sends a file to the server where directoryName/fileName is the path of the file,
// and data is the content of the file
var sendFileToServer = function(directoryName, fileName, data) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length-1]
  socket.emit('send file', {fileName: currentDir + '/' + fileName, fileContents: data});

}

// deletes a file from the server where directoryName/fileName is the path of the file,
var deleteFileFromServer = function(directoryName, fileName) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length - 1]
  socket.emit('send file', {fileName: currentDir + '/' + fileName, deleted: true});
}

var sendDirectory = function(directoryName, subDirectories) {
  fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {
    if (err) throw err;
    // fileName could be a file or a directory
    fileNames.forEach(function(fileName){
      fs.readFile(directoryName + '/' + subDirectories + '/' + fileName, 'utf-8', function(err, data) {
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
      }

      $("#log").append("<div>Listening to " + directoryNames[0] + "</div>");

      requestRoom(directoryNames[0]);

      sendDirectory(directoryNames[0], "");

      watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, function(event, fileName) {
        fs.readFile(directoryNames[0] + '/' + fileName, 'utf-8', function(err, data) {
          if (err) {
            // delete from server
            deleteFileFromServer(directoryNames[0], fileName);
          } else {
            // send to server
            sendFileToServer(directoryNames[0], fileName, data);
          }
        })
      })
    })
  })

  $("#stopListening").on("click", function() {
    if (watcher) {
      watcher.close();
      watcher = null;
      $("#log").append("<div>Stopped listening to folder</div>");
    }
  })

  $("#connectFolder").on("click", function() {
    dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
      if (!directoryNames) {
        return;
      }

      serverFolder = $("#serverFolder").val();;
      if (serverFolder === "") {
        $("#log").append("<div>Please enter a server folder first</div>");
        return;
      }

      socket.emit('connect folder', serverFolder);

      $("#log").append("<div>Connected to: " + serverFolder + ", storing to " + directoryNames[0] + "</div>");

    })
  })

  socket.on('send file', function(msg) {
    //$('#file').text(msg.fileName);
    console.log(msg.fileName);
  });

  socket.on('folder does not exist', function() {
    ("#log").append("<div>Folder does not exit</div>")
  })



})
