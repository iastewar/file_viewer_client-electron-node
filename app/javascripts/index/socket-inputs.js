var fs = require('fs');
var helpers = require('./helpers');

var on = {};

on.sendFile = function(msg) {
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
}

on.sendDirectoryError = function() {
  helpers.connectedDirectory = null;
  helpers.serverDirectory = null;
  $("#log").append("<div>Problem retrieving directory. Either folder does not exist, or the server is experiencing problems</div>");
}

module.exports = on;
