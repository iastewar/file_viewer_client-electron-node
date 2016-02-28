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

// key is chosen directory name, value is an object with full directory name, watcher, gitignore, sentDirectory, totalInitialFiles, numberOfFiles, directorySize, broadcastsInProgress, oldNumberOfFiles
helpers.broadcastingRepos = {};
helpers.numBroadcastingRepos = 0;

// key is directory owner/name, value is a string representing the storingTo location
helpers.connectedRepos = {};

// sets up a gitignore with a .gitignore file if it exists in the fileNames array
helpers.setUpGitIgnore = function(directoryName, fileNames, chosenDirectoryName, callback) {
  var index = 0;

  var incIndex = function() {
    index++;
    if (index === fileNames.length) {
      if (callback) callback();
    }
  }

  fileNames.forEach(function(fileName) {
    if (fileName === ".gitignore") {
      fs.readFile(directoryName + helpers.separator + fileName, 'utf8', function(err, data) {
        helpers.broadcastingRepos[chosenDirectoryName].gitignore = parser.compile(data);
        console.log("gitignore created for" + directoryName);
        incIndex();
      });
    } else {
      incIndex();
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
    if (!ab) return "";
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
  // console.log("sending: " + directoryName + "/" + fileName);

  var dirArray = directoryName.split(helpers.separator);
  var currentDir = dirArray[dirArray.length-1];

  if (helpers.separator === "\\") {
    fileName = fileName.replace(/\\/g, '/');
  }

  helpers.socket.emit('send file', JSON.stringify({fileName: currentDir + '/' + fileName, fileContents: data}));
}

// deletes a file from the server where directoryName/fileName is the path of the file,
helpers.deleteFileFromServer = function(directoryName, fileName) {
  var dirArray = directoryName.split(helpers.separator);
  var currentDir = dirArray[dirArray.length - 1];

  if (helpers.separator === "\\") {
    fileName = fileName.replace(/\\/g, '/');
  }

  helpers.socket.emit('send file', JSON.stringify({fileName: currentDir + '/' + fileName, deleted: true}));
}

helpers.sendDirectory = function(directoryName, subDirectories, chosenDirectoryName, callback) {
  fs.readdir(directoryName + helpers.separator + subDirectories, function(err, fileNames) {
    if (err) {
      // either the directory doesn't exist or we can't open this many files at once
      if (callback) callback(err);
    } else {
      var sendTheFiles = function() {
        if (fileNames.length === 0) {
          if (callback) callback();
          return;
        }

        var index = 0;

        var incIndex = function() {
          index++;
          if (index === fileNames.length) {
            if (callback) callback();
          }
        }

        // fileName could be a file or a directory
        fileNames.forEach(function(fileName) {
          fs.stat(directoryName + helpers.separator + subDirectories + helpers.separator + fileName, function(err, stats) {
            if (err) {
              console.log(err);
              incIndex();
            } else if (!stats) {
              console.log("could not retrieve stats for file: " + directoryName + helpers.separator + subDirectories + helpers.separator + fileName);
              incIndex();
            } else {
              var subDirs;
              if (subDirectories === "") {
                subDirs = fileName;
              } else {
                subDirs = subDirectories + helpers.separator + fileName;
              }

              if (helpers.broadcastingRepos[chosenDirectoryName] && helpers.broadcastingRepos[chosenDirectoryName].gitignore && helpers.broadcastingRepos[chosenDirectoryName].gitignore.denies(subDirs)) {
                console.log("denied " + subDirs);
                incIndex();
              } else if (stats.isFile() && stats.size > helpers.maxFileSize) {
                $("#broadcast-messages").html(
                  "<div class='alert alert-warning'>" +
                  "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
                  "Warning: one or more files were over " + helpers.maxFileSize / 1048576 + "MB and could not be sent." +
                  "</div>"
                );
                incIndex();
              } else if (stats.isDirectory()) {
                if (fileName !== ".git") {
                  helpers.sendDirectory(directoryName, subDirs, chosenDirectoryName, function(err) {
                    incIndex();
                  });
                } else {
                  incIndex();
                }
              } else if (stats.isFile()) {
                helpers.broadcastingRepos[chosenDirectoryName].totalInitialFiles++;
                $("#broadcast-progress-bar-" + chosenDirectoryName).progressbar({max: helpers.broadcastingRepos[chosenDirectoryName].totalInitialFiles});

                var readFile = function(callback) {
                  fs.readFile(directoryName + helpers.separator + subDirectories + helpers.separator + fileName, function(err, data) {
                    if (err) {
                      readFile();
                    } else {
                      helpers.sendFileToServer(directoryName, subDirs, data);
                      incIndex();
                    }
                  });
                }
                readFile();
              } else {
                incIndex(); // just to be safe
              }
            }
          });
        });
      }

      if (helpers.broadcastingRepos[chosenDirectoryName] && !helpers.broadcastingRepos[chosenDirectoryName].gitignore && !helpers.broadcastingRepos[chosenDirectoryName].sentDirectory) {
        helpers.setUpGitIgnore(directoryName, fileNames, chosenDirectoryName, sendTheFiles);
        helpers.broadcastingRepos[chosenDirectoryName].sentDirectory = true;
      } else {
        sendTheFiles();
      }
    }
  });
}

module.exports = helpers;
