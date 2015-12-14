var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var socket = require('../socket');
var helpers = require('./helpers');
var ipc = require('electron').ipcRenderer;

var connecting = {};

var sendFile = function(msg) {
  var dirFileArray = msg.fileName.split("/");
  var serverDir = msg.owner + "/" + dirFileArray[0];
  if (!helpers.connectedRepos[serverDir]) {
    console.log("Error! Received an unknown file")
  } else {
    // else write file to the connected directory.
    // get directory of file to be saved
    var directory = helpers.connectedRepos[serverDir];
    for (var i = 0; i < dirFileArray.length - 1; i++) {
      directory = directory + '/' + dirFileArray[i];
    }

    // try to create the directory
    fs.mkdir(directory, function(err) {
      // if file should be deleted, delete it
      if (msg.deleted) {
        fs.stat(helpers.connectedRepos[serverDir] + '/' + msg.fileName, function(err, stats) {
        if (!stats) {
          return;
        }
        if (stats.isFile()) {
          fs.unlink(helpers.connectedRepos[serverDir] + '/' + msg.fileName, function(err) {
            if (err) {
              return console.log(err);
            }
          });
        } else {
          helpers.rmdirRec(helpers.connectedRepos[serverDir] + '/' + msg.fileName, "");
        }
      });
      // otherwise, save the file
      } else {
        fs.writeFile(helpers.connectedRepos[serverDir] + '/' + msg.fileName, helpers.toBuffer(msg.fileContents), function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });
      }
    });
  }
}

var sendDirectoryError = function(msg) {
  delete connecting[msg];
  console.log("Problem retrieving directory " + msg + ". Either folder does not exist, or the server is experiencing problems")
  //$("#log").append("<div>Problem retrieving directory. Either folder does not exist, or the server is experiencing problems</div>");
}




var addRow = function(owner, name, storingTo) {
  $("#connectedRepos").append(
  "<div class='row'>" +
    "<div class='col-md-3 connectedName'>" + name + "</div>" +
    "<div class='col-md-3 connectedOwner'>" + owner + "</div>" +
    "<div class='col-md-3 connectedStoringTo'>" + storingTo + "</div>" +
    "<button class='col-md-1 stopConnecting btn btn-danger'>Stop</button>" +
  "</div>"

  );
}

$(function() {
  $("#connect-btn").on("click", function() {
    ipc.send('open-connect-window');
  });

  $("#connectedRepos").on("click", ".stopConnecting", function() {
    var connectedName = $(this).parent().find(".connectedName").html();
    var connectedOwner = $(this).parent().find(".connectedOwner").html()

    delete helpers.connectedRepos[connectedOwner + "/" + connectedName];

    socket.emit('disconnect folder', connectedOwner + "/" + connectedName);

    $(this).parent().remove();
  })
});

// args is an object with name, owner, and storingTo
ipc.on('connecting', function(event, args) {
  console.log("connecting to " + args.owner + "/" + args.name);

  var serverFolder = args.owner + "/" + args.name;

  socket.emit('connect folder', serverFolder);
  connecting[serverFolder] = args.storingTo;
});

socket.on('connected', function(msg) {
  console.log(msg);
  helpers.connectedRepos[msg] = connecting[msg];
  arr = msg.split("/");

  addRow(arr[0], arr[1], connecting[msg]);

  delete connecting[msg];
});

socket.on('send file', sendFile);

socket.on('send directory error', sendDirectoryError);
