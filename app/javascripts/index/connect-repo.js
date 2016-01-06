var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var socket = require('../socket');
var helpers = require('./helpers');
var ipc = require('electron').ipcRenderer;

// seperator is "/" for mac and linux, and "\\" for windows
var seperator = "/";

var connecting = {};

var numRepos = 0;

var sendFile = function(msg) {
  if (seperator === "\\") {
    msg.fileName = msg.fileName.replace(/\//g, '\\');
  }
  var dirFileArray = msg.fileName.split(seperator);
  var serverDir = msg.owner + "/" + dirFileArray[0];
  if (!helpers.connectedRepos[serverDir]) {
    console.log("Error! Received an unknown file")
  } else {
    // else write file to the connected directory.
    // if file should be deleted, delete it
    if (msg.deleted) {
      fs.stat(helpers.connectedRepos[serverDir] + seperator + msg.fileName, function(err, stats) {
        if (!stats) {
          return;
        }
        if (stats.isFile()) {
          fs.unlink(helpers.connectedRepos[serverDir] + seperator + msg.fileName, function(err) {
            if (err) {
              return console.log(err);
            }
          });
        } else {
          helpers.rmdirRec(helpers.connectedRepos[serverDir] + seperator + msg.fileName, "");
        }
      });
    } else {
      // otherwise, save the file
      // get directory of file to be saved
      var directory = helpers.connectedRepos[serverDir];

      // try to create the directory followed by the file
      var createDirectory = function(index) {
        directory = directory + '/' + dirFileArray[index];
        if (index >= dirFileArray.length - 2) {
          fs.mkdir(directory, function(err) {
            createFile();
          });
        } else {
          fs.mkdir(directory, function(err) {
            createDirectory(index+1);
          });
        }
      }

      var createFile = function() {
        fs.writeFile(helpers.connectedRepos[serverDir] + seperator + msg.fileName, helpers.toBuffer(msg.fileContents), function(err) {
            if (err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });
      }

      fs.mkdir(directory, function(err) {
        createDirectory(0);
      });

    }
  }
}

var sendDirectoryError = function(msg) {
  if (connecting[msg]) {
    delete connecting[msg];
    $("#connect-messages").html(
      "<div class='alert alert-danger'>" +
      "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
      "Problem retrieving directory " + msg + ". Either repository does not exist, or the server is experiencing problems." +
      "</div>"
    );
  }
}

var addRow = function(owner, name, storingTo) {
  $("#connectedRepos").append(
  "<tr>" +
    "<td class='connectedName' width='20%'>" + name + "</td>" +
    "<td class='connectedOwner' width='20%'>" + owner + "</td>" +
    "<td class='connectedStoringTo' width='40%'>" + storingTo + "</td>" +
    "<td width='20%'><div class='btn btn-danger stopConnecting'><span class='fa fa-stop'>&nbsp;&nbsp;Stop</span></div></td>" +
  "</tr>"

  );
}

var addHeader = function() {
  $("#connectedReposHead").append(
  "<tr>" +
    "<th width='20%'>Name</th>" +
    "<th width='20%'>Owner</th>" +
    "<th width='40%'>Storing To</th>" +
    "<th width='20%'>Stop Connecting?</th>" +
  "</tr>"
  );
}

var removeHeader = function() {
  $("#connectedReposHead").html("");
}

$(function() {
  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      if ($(".active").find("a").html() === "Connect") {
        ipc.send('open-connect-window');
      }
    }
  });

  $("#connect-btn").on("click", function() {
    ipc.send('open-connect-window');
  });

  $("#connectedRepos").on("click", ".stopConnecting", function() {
    var connectedName = $(this).parent().parent().find(".connectedName").html();
    var connectedOwner = $(this).parent().parent().find(".connectedOwner").html()

    delete helpers.connectedRepos[connectedOwner + "/" + connectedName];

    socket.emit('disconnect folder', connectedOwner + "/" + connectedName);

    $(this).parent().parent().remove();

    if (numRepos === 1)
      removeHeader();
    numRepos--;
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
  if (connecting[msg]) {
    console.log(msg);
    helpers.connectedRepos[msg] = connecting[msg];
    arr = msg.split("/");

    addRow(arr[0], arr[1], connecting[msg]);

    if (numRepos === 0)
      addHeader();
    numRepos++;


    delete connecting[msg];
  }
});

socket.on('send file', sendFile);

socket.on('send directory error', sendDirectoryError);
