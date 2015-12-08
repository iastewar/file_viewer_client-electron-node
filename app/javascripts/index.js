var fs = require('fs');
var parser = require('gitignore-parser')
var remote = require('remote');
var dialog = remote.require('dialog');

var serverUrl = 'http://localhost:3000';
var socket = io(serverUrl);

var watcher;
var connectedDirectory;
var serverDirectory;
var gitignore;

// sets up a gitignore with a .gitignore file if it exists in the fileNames array
var setUpGitIgnore = function(directoryName, fileNames, callback) {
  var index = 0;
  fileNames.forEach(function(fileName) {
    if (fileName === ".gitignore") {
      fs.readFile(directoryName + "/" + fileName, 'utf8', function(err, data) {
        gitignore = parser.compile(data);
        console.log("gitignore created");
        index++;
        if (index === fileNames.length) {
          if (callback) {
            callback();
          }
        }
      });
    } else {
      index++;
      if (index === fileNames.length) {
        if (callback) {
          callback();
        }
      }
    }

  });
}

// removes a directory asynchronously
var rmdirAsync = function(path, callback) {
	fs.readdir(path, function(err, files) {
		if(err) {
			// Pass the error on to callback
			callback(err, []);
			return;
		}
		var wait = files.length,
			count = 0,
			folderDone = function(err) {
			count++;
			// If we cleaned out all the files, continue
			if( count >= wait || err) {
				fs.rmdir(path,callback);
			}
		};
		// Empty directory to bail early
		if(!wait) {
			folderDone();
			return;
		}

		// Remove one or more trailing slash to keep from doubling up
		path = path.replace(/\/+$/,"");
		files.forEach(function(file) {
			var curPath = path + "/" + file;
			fs.lstat(curPath, function(err, stats) {
				if( err ) {
					callback(err, []);
					return;
				}
				if( stats.isDirectory() ) {
					rmdirAsync(curPath, folderDone);
				} else {
					fs.unlink(curPath, folderDone);
				}
			});
		});
	});
};

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

var sendDirectoryCount = 0;
var sendDirectory = function(directoryName, subDirectories) {
  sendDirectoryCount++;
  //var gitIgnore = "test 2.txt";
  fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {
    if (err) {
      $("#errors").html("Error: folder contains too many files or does not exist. Try creating a .gitignore file.");
      return;
    }

    var sendTheFiles = function() {
      // fileName could be a file or a directory
      fileNames.forEach(function(fileName){
        fs.stat(directoryName + '/' + subDirectories + '/' + fileName, function(err, stats) {
          var subDirs;
          if (subDirectories === "") {
            subDirs = fileName;
          } else {
            subDirs = subDirectories + '/' + fileName;
          }
          if (gitignore && gitignore.denies(subDirs)) {
            console.log("denied " + subDirs);
            return;
          }
          if (stats.isFile() && stats.size > 16777216) {
            console.log("Error, " + fileName + " is over 16MB and can't be sent");
          } else if (stats.isDirectory()) {
            sendDirectory(directoryName, subDirs);
          } else {
            fs.readFile(directoryName + '/' + subDirectories + '/' + fileName, function(err, data) {
              sendFileToServer(directoryName, subDirs, data);
            });
          }
        });
      });
    }

    if (!gitignore && sendDirectoryCount === 1) {
      setUpGitIgnore(directoryName, fileNames, sendTheFiles);
    } else {
      sendTheFiles();
    }

  });
}

$(function() {

  $("#listenFolder").on("click", function() {
    if (watcher) {
      watcher.close();
      watcher = null;
      gitignore = null;
      sendDirectoryCount = 0;
      $("#log").append("<div>Stopped listening to folder</div>");
    }

    dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
      if (!directoryNames) {
        return;
      } else {
        $("#log").append("<div>Listening to " + directoryNames[0] + "</div>");

        sendDirectory(directoryNames[0], "");

        watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, function(event, fileName) {
          fs.stat(directoryNames[0] + '/' + fileName, function(err, stats) {
            if (gitignore && gitignore.denies(fileName)) {
              console.log("denied " + fileName);
              return;
            }
            if (err) {
              // nonexistent so delete from server
              deleteFileFromServer(directoryNames[0], fileName);
            } else if (stats.isFile() && stats.size > 16777216) {
              console.log("Error, " + fileName + " is over 16MB and can't be sent");
            } else {
              // send to server
              if (stats.isFile()) {
                fs.readFile(directoryNames[0] + '/' + fileName, function(err, data) {
                  if (err) {
                    console.log(err);
                  }
                  sendFileToServer(directoryNames[0], fileName, data);
                });
              } else {
                sendDirectory(directoryNames[0], fileName);
              }

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
      gitignore = null;
      sendDirectoryCount = 0;
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
          fs.stat(connectedDirectory + '/' + msg.fileName, function(err, stats) {
          if (!stats) {
            return;
          }
          if (stats.isFile()) {
            fs.unlink(connectedDirectory + '/' + msg.fileName, function(err) {
              if (err) {
                return console.log(err);
              }
            });
          } else {
            rmdirAsync(connectedDirectory + '/' + msg.fileName);
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

  socket.on('send directory error', function() {
    connectedDirectory = null;
    serverDirectory = null;
    ("#log").append("<div>Problem retrieving directory. Either folder does not exist, or the server is experiencing problems</div>");
  });



});
