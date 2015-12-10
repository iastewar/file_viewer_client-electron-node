var fs = require('fs');
var parser = require('gitignore-parser')
var socket = require('../socket');
var helpers = {};

helpers.watcher = null;
helpers.connectedDirectory = null;
helpers.serverDirectory = null;
helpers.gitignore = null;

// sets up a gitignore with a .gitignore file if it exists in the fileNames array
helpers.setUpGitIgnore = function(directoryName, fileNames, callback) {
  var index = 0;
  fileNames.forEach(function(fileName) {
    if (fileName === ".gitignore") {
      fs.readFile(directoryName + "/" + fileName, 'utf8', function(err, data) {
        helpers.gitignore = parser.compile(data);
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

helpers.rmdirRec = function(directoryName, subDirectories, callback) {
	fs.readdir(directoryName + '/' + subDirectories, function(err, fileNames) {

		var index = 0;
		fileNames.forEach(function(fileName) {
			fs.stat(directoryName + '/' + subDirectories + '/' + fileName, function(err, stats) {
				if (err || !stats) {
					console.log("trying to remove: " + directoryName + '/' + subDirectories + '/' + fileName);
					fs.rmdir(directoryName + '/' + subDirectories + '/' + fileName, function(err) {
						console.log(err);
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
									if (err)
										console.log(err);
									if (callback)
										callback();
								});
							}
						});
					} else {
						fs.unlink(directoryName + '/' + subDirectories + '/' + fileName, function(err) {
							if (err) {
								console.log(err);
							}
							index++;
	            if (index === fileNames.length) {
	              fs.rmdir(directoryName + '/' + subDirectories, function(err) {
									if (err)
										console.log(err);
									if (callback)
										callback();
								});
	            }
						});
					}
				}

			});
		});
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

helpers.sendDirectoryCount = 0;
helpers.sendDirectory = function(directoryName, subDirectories) {
  helpers.sendDirectoryCount++;
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
          if (helpers.gitignore && helpers.gitignore.denies(subDirs)) {
            console.log("denied " + subDirs);
            return;
          }
          if (stats.isFile() && stats.size > 16777216) {
            console.log("Error, " + fileName + " is over 16MB and can't be sent");
          } else if (stats.isDirectory()) {
            helpers.sendDirectory(directoryName, subDirs);
          } else {
            fs.readFile(directoryName + '/' + subDirectories + '/' + fileName, function(err, data) {
              helpers.sendFileToServer(directoryName, subDirs, data);
            });
          }
        });
      });
    }

    if (!helpers.gitignore && helpers.sendDirectoryCount === 1) {
      helpers.setUpGitIgnore(directoryName, fileNames, sendTheFiles);
    } else {
      sendTheFiles();
    }

  });
}

module.exports = helpers;
