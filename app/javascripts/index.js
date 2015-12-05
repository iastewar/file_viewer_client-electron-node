var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');

var serverUrl = 'http://localHost:3000';
var socket = io(serverUrl);

var watcher;

// sends a file to the server where directoryName/fileName is the path of the file,
// data is the content of the file, and url is where the file will be sent
var sendFileToServer = function(directoryName, fileName, data, url) {
  var formData = new FormData();

  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length-1]

  // formData.append('fileName', currentDir + '/' + fileName)
  // formData.append('fileContents', data);
  //
  // $.ajax({
  //   url: url,
  //   method: "POST",
  //   data: formData,
  //   contentType: false,
  //   processData: false
  // })

  socket.emit('file received', {fileName: currentDir + '/' + fileName, fileContents: data});

}

// deletes a file from the server where directoryName/fileName is the path of the file,
// and url is where the file will be sent
var deleteFileFromServer = function(directoryName, fileName, url) {
  var formData = new FormData();

  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length - 1]

  // formData.append('fileName', currentDir + '/' + fileName);
  // formData.append('deleted', true);
  //
  // $.ajax({
  //   url: url,
  //   method: "POST",
  //   data: formData,
  //   contentType: false,
  //   processData: false
  // })

  socket.emit('file received', {fileName: currentDir + '/' + fileName, deleted: true});
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
          sendFileToServer(directoryName, subDirs, data, serverUrl);
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

      sendDirectory(directoryNames[0], "");

      watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, function(event, fileName) {
        fs.readFile(directoryNames[0] + '/' + fileName, 'utf-8', function(err, data) {
          if (err) {
            // delete from server
            deleteFileFromServer(directoryNames[0], fileName, serverUrl);
          } else {
            // send to server
            sendFileToServer(directoryNames[0], fileName, data, serverUrl);
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

  // $('form').submit(function(){
  //  socket.emit('chat message', $('#m').val());
  //  $('#m').val('');
  //  event.preventDefault();
  // });

  socket.on('file received', function(msg){
    $('#file').text(msg);
  });

})
