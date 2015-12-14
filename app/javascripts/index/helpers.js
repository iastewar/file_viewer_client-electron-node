var fs = require('fs');
var parser = require('gitignore-parser')
var socket = require('../socket');
var helpers = {};

// key is directory name, value is an object with watcher, gitignore, and sentDirectory
helpers.broadcastingRepos = {};

// key is directory owner/name, value is a string representing the storingTo location
helpers.connectedRepos = {};

// sets up a gitignore with a .gitignore file if it exists in the fileNames array
helpers.setUpGitIgnore = function(directoryName, fileNames, callback) {
  var index = 0;
  fileNames.forEach(function(fileName) {
    if (fileName === ".gitignore") {
      fs.readFile(directoryName + "/" + fileName, 'utf8', function(err, data) {
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
	fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {
		if (err) {
			if (callback)
				callback();
		} else {
			var index = 0;
			fileNames.forEach(function(fileName) {
				fs.stat(directoryName + '/' + subDirectories + '/' + fileName, function(err, stats) {
					if (err || !stats) {
						fs.rmdir(directoryName + '/' + subDirectories + '/' + fileName, function(err) {
						});
					} else {
						var subDirs;
						if (subDirectories === "") {
							subDirs = fileName;
						} else {
							subDirs = subDirectories + '/' + fileName;
						}

						if (stats.isDirectory()) {
							helpers.rmdirRec(directoryName, subDirs, function() {
								index++;
								if (index === fileNames.length) {
									fs.rmdir(directoryName + '/' + subDirectories, function(err) {
										if (callback)
											callback();
									});
								}
							});
						} else {
							fs.unlink(directoryName + '/' + subDirectories + '/' + fileName, function(err) {
								index++;
		            if (index === fileNames.length) {
		              fs.rmdir(directoryName + '/' + subDirectories, function(err) {
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
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length-1];
  socket.emit('send file', {fileName: currentDir + '/' + fileName, fileContents: data});
}

// deletes a file from the server where directoryName/fileName is the path of the file,
helpers.deleteFileFromServer = function(directoryName, fileName) {
  var dirArray = directoryName.split("/");
  var currentDir = dirArray[dirArray.length - 1];
  socket.emit('send file', {fileName: currentDir + '/' + fileName, deleted: true});
}


helpers.sendDirectory = function(directoryName, subDirectories) {
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
          if (helpers.broadcastingRepos[directoryName] && helpers.broadcastingRepos[directoryName].gitignore && helpers.broadcastingRepos[directoryName].gitignore.denies(subDirs)) {
            console.log("denied " + subDirs);
            return;
          }
          if (stats.isFile() && stats.size > 16777216) {
            console.log("Error, " + fileName + " is over 16MB and can't be sent");
          } else if (stats.isDirectory()) {
            if (fileName !== ".git") {
              helpers.sendDirectory(directoryName, subDirs);
            }
          } else {
            fs.readFile(directoryName + '/' + subDirectories + '/' + fileName, function(err, data) {
              helpers.sendFileToServer(directoryName, subDirs, data);
            });
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
