var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var socketFunctions = require('../socket-functions');
var helpers = require('./helpers');
var ipc = require('electron').ipcRenderer;

if (!socketFunctions.socket) {
  socketFunctions.connect(socket);
}
var socket = socketFunctions.socket;

// seperator is "/" for mac and linux, and "\\" for windows
var seperator = "/";
if (process.platform === 'win32') {
  seperator = "\\"
}

var userFolders = {};

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
    "<td width='20%'><div class='btn btn-danger stopConnecting stop-btn'><span class='fa fa-stop'></span></div></td>" +
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
  // $(document).on("keydown", function() {
  //   if (event.keyCode === 13) {
  //     if ($(".active").find("a").html() === "Connect") {
  //       ipc.send('open-connect-window');
  //     }
  //   }
  // });

  $("#connect-btn").on("click", function() {
    $("#view-form-container").hide();
    $("#forms-container").show();
    $("#connect-form").attr("data", "showing");
    $("#main-container").css("opacity", "0.3");
    $("#empty-container").css("z-index", "50");
  });

  $("#connect-form-show").on("click", function() {
    var owner = $("#connect-form input[name='owner']").val();
    if (owner === "") return;
    socket.emit('show user folders', owner);
    if (helpers.connectFormShowing && helpers.connectFormShowing !== helpers.viewFormShowing) {
      console.log(helpers.viewFormShowing + " " + helpers.connectFormShowing);
      socket.emit('disconnect user folders', helpers.connectFormShowing);
    }
    helpers.connectFormShowing = owner;
    userFolders = {};
    $("#connect-form input[name='owner']").val("");
    $("#connect-form-show-header").html(owner + "'s Repositories")
    $("#connect-form-show-container").show().html("");
  });

  $("#connect-form-show-container").on("click", ".user-folder", function() {
    dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
      if (!directoryNames) {
        return;
      } else {
        console.log("connecting to " + helpers.connectFormShowing + "/" + $("#connect-form-show-container .user-folder").html());

        var serverFolder = helpers.connectFormShowing + "/" + $("#connect-form-show-container .user-folder").html();

        socket.emit('connect folder', serverFolder);
        connecting[serverFolder] = directoryNames[0];

        $("#forms-container").hide();
        $("#connect-form").attr("data", "hidden");
        $("#main-container").css("opacity", "1");
        $("#empty-container").css("z-index", "-50");
      }
    });
  });


  $("#connectedRepos").on("click", ".stopConnecting", function() {
    var connectedName = $(this).parent().parent().find(".connectedName").html();
    var connectedOwner = $(this).parent().parent().find(".connectedOwner").html()

    delete helpers.connectedRepos[connectedOwner + "/" + connectedName];

    if (helpers.viewServerFolder !== connectedOwner + "/" + connectedName) {
      socket.emit('disconnect folder', connectedOwner + "/" + connectedName);
    }

    $(this).parent().parent().remove();

    if (numRepos === 1) {
      removeHeader();
      $("#connect-help").show();
    }
    numRepos--;
  })
});

// args is an object with name, owner, and storingTo
// ipc.on('connecting', function(event, args) {
//   console.log("connecting to " + args.owner + "/" + args.name);
//
//   var serverFolder = args.owner + "/" + args.name;
//
//   socket.emit('connect folder', serverFolder);
//   connecting[serverFolder] = args.storingTo;
// });

socket.on('connected', function(msg) {
  if (connecting[msg]) {
    console.log(msg);
    helpers.connectedRepos[msg] = connecting[msg];
    arr = msg.split("/");

    addRow(arr[0], arr[1], connecting[msg]);

    if (numRepos === 0) {
      addHeader();
      $("#connect-help").hide();
    }
    numRepos++;


    delete connecting[msg];
  }
});

socket.on('send file', sendFile);

socket.on('send directory error', sendDirectoryError);

socket.on('user folder', function(msg) {
  if (msg.owner !== helpers.connectFormShowing) return;

  if ($("#connect-form-show-error-message").length !== 0) {
    $("#connect-form-show-error-message").remove();
  }

  if (!userFolders[msg.name]) {
    $("#connect-form-show-container").append("<div class='user-folder'>" + msg.name + "</div>");
    userFolders[msg.name] = true;
  }
});

socket.on('delete user folder', function(msg) {
  if (msg.owner !== helpers.connectFormShowing) return;

  $("#connect-form-show-container .user-folder:contains('" + msg.name + "')").remove();
  delete userFolders[msg.name];
});

socket.on('user folder empty', function(msg) {
  if (msg !== helpers.connectFormShowing) return;

  $("#connect-form-show-container").html("<div id='connect-form-show-error-message' class='alert alert-danger'>This user has no repositories or does not exist</div>");
  userFolders = {};
});
