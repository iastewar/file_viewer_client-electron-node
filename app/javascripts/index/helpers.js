var fs = require('fs');
var parser = require('gitignore-parser');
var helpers = {};

helpers.socket;
helpers.separator;
helpers.loggedIn;
helpers.maxFileSize;
helpers.connectFormShowing;
helpers.viewFormShowing;
helpers.viewServerFolder;

// key is directory name, value is an object with watcher, gitignore, and sentDirectory
helpers.broadcastingRepos = {};
helpers.numBroadcastingRepos = 0;

// key is directory owner/name, value is a string representing the storingTo location
helpers.connectedRepos = {};

// sets up a gitignore with a .gitignore file if it exists in the fileNames array
helpers.setUpGitIgnore = function(directoryName, fileNames, callback) {
  var index = 0;
  fileNames.forEach(function(fileName) {
    if (fileName === ".gitignore") {
      fs.readFile(directoryName + helpers.separator + fileName, 'utf8', function(err, data) {
        helpers.broadcastingRepos[directoryName].gitignore = parser.compile(data);
        console.log("gitignore created for" + directoryName);
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

helpers.rmdirRec = function(directoryName, subDirectories, callback) {
	fs.readdir(directoryName + helpers.separator + subDirectories, function(err, fileNames) {
		if (err) {
			if (callback)
				callback();
		} else {
			var index = 0;
			fileNames.forEach(function(fileName) {
				fs.stat(directoryName + helpers.separator + subDirectories + helpers.separator + fileName, function(err, stats) {
					if (err || !stats) {
						fs.rmdir(directoryName + helpers.separator + subDirectories + helpers.separator + fileName, function(err) {
						});
					} else {
						var subDirs;
						if (subDirectories === "") {
							subDirs = fileName;
						} else {
							subDirs = subDirectories + helpers.separator + fileName;
						}

						if (stats.isDirectory()) {
							helpers.rmdirRec(directoryName, subDirs, function() {
								index++;
								if (index === fileNames.length) {
									fs.rmdir(directoryName + helpers.separator + subDirectories, function(err) {
										if (callback)
											callback();
									});
								}
							});
						} else {
							fs.unlink(directoryName + helpers.separator + subDirectories + helpers.separator + fileName, function(err) {
								index++;
		            if (index === fileNames.length) {
		              fs.rmdir(directoryName + helpers.separator + subDirectories, function(err) {
										if (callback)
											callback();
									});
		            }
							});
						}
					}
				});
			});
		}
	});
}

// converts an ArrayBuffer to a Buffer
helpers.toBuffer = function(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

// sends a file to the server where directoryName/fileName is the path of the file,
// and data is the content of the file
helpers.sendFileToServer = function(directoryName, fileName, data) {
  var dirArray = directoryName.split(helpers.separator);
  var currentDir = dirArray[dirArray.length-1];

  if (helpers.separator === "\\") {
    fileName = fileName.replace(/\\/g, '/');
  }

  helpers.socket.emit('send file', {fileName: currentDir + '/' + fileName, fileContents: data});
}

// deletes a file from the server where directoryName/fileName is the path of the file,
helpers.deleteFileFromServer = function(directoryName, fileName) {
  var dirArray = directoryName.split(helpers.separator);
  var currentDir = dirArray[dirArray.length - 1];

  if (helpers.separator === "\\") {
    fileName = fileName.replace(/\\/g, '/');
  }

  helpers.socket.emit('send file', {fileName: currentDir + '/' + fileName, deleted: true});
}


helpers.sendDirectory = function(directoryName, subDirectories) {
  fs.readdir(directoryName + helpers.separator + subDirectories, function(err, fileNames) {
    if (err) {
      $("#broadcast-messages").html(
        "<div class='alert alert-danger'>" +
        "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
        "Error: folder contains too many files and the broadcast may have failed. Try creating a .gitignore file." +
        "</div>"
      );
    }

    var sendTheFiles = function() {
      // fileName could be a file or a directory
      fileNames.forEach(function(fileName){
        fs.stat(directoryName + helpers.separator + subDirectories + helpers.separator + fileName, function(err, stats) {
          if (err) {
            console.log(err);
          } else if (!stats) {
            console.log("could not retrieve stats for file: " + directoryName + helpers.separator + subDirectories + helpers.separator + fileName)
          } else {
            var subDirs;
            if (subDirectories === "") {
              subDirs = fileName;
            } else {
              subDirs = subDirectories + helpers.separator + fileName;
            }
            if (helpers.broadcastingRepos[directoryName] && helpers.broadcastingRepos[directoryName].gitignore && helpers.broadcastingRepos[directoryName].gitignore.denies(subDirs)) {
              console.log("denied " + subDirs);
              return;
            }
            if (stats.isFile() && stats.size > helpers.maxFileSize) {
              $("#broadcast-messages").html(
                "<div class='alert alert-danger'>" +
                "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
                "One or more files were over " + helpers.maxFileSize / 1048576 + "MB and could not be sent." +
                "</div>"
              );
            } else if (stats.isDirectory()) {
              if (fileName !== ".git") {
                helpers.sendDirectory(directoryName, subDirs);
              }
            } else {
              fs.readFile(directoryName + helpers.separator + subDirectories + helpers.separator + fileName, function(err, data) {
                helpers.sendFileToServer(directoryName, subDirs, data);
              });
            }
          }
        });
      });
    }

    if (helpers.broadcastingRepos[directoryName] && !helpers.broadcastingRepos[directoryName].gitignore && !helpers.broadcastingRepos[directoryName].sentDirectory) {
      helpers.setUpGitIgnore(directoryName, fileNames, sendTheFiles);
      helpers.broadcastingRepos[directoryName].sentDirectory = true;
    } else {
      sendTheFiles();
    }

  });
}

module.exports = helpers;
