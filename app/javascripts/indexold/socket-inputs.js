var fs = require('fs');
var helpers = require('./helpers');

var on = {};

on.sendFile = function(msg) {
  //$('#file').text(msg.fileName);
  if (!helpers.connectedDirectories) {
    console.log("Error! Received an unknown file")
  } else {
    // else write file to the connected directory.
    // get directory of file to be saved
    var dirFileArray = msg.fileName.split("/");
    var directory = helpers.connectedDirectories;
    for (var i = 0; i < dirFileArray.length - 1; i++) {
      directory = directory + '/' + dirFileArray[i];
    }

    // try to create the directory
    fs.mkdir(directory, function(err) {
      // if file should be deleted, delete it
      if (msg.deleted) {
        fs.stat(helpers.connectedDirectories + '/' + msg.fileName, function(err, stats) {
        if (!stats) {
          return;
        }
        if (stats.isFile()) {
          fs.unlink(helpers.connectedDirectories + '/' + msg.fileName, function(err) {
            if (err) {
              return console.log(err);
            }
          });
        } else {
          helpers.rmdirRec(helpers.connectedDirectories + '/' + msg.fileName, "");
        }
      });
      // otherwise, save the file
      } else {
        fs.writeFile(helpers.connectedDirectories + '/' + msg.fileName, helpers.toBuffer(msg.fileContents), function(err) {
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
  helpers.connectedDirectories = null;
  helpers.serverDirectories = null;
  $("#log").append("<div>Problem retrieving directory. Either folder does not exist, or the server is experiencing problems</div>");
}

module.exports = on;
