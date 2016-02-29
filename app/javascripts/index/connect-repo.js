module.exports = function(helpers) {

var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');

var socket = helpers.socket;

var userFolders = {};

var connecting = {};

var numRepos = 0;

var sendFile = function(msg) {
  msg = JSON.parse(msg);
  if (msg.fileContents) msg.fileContents = new Uint8Array(msg.fileContents.data).buffer;

  if (helpers.separator === "\\") {
    msg.fileName = msg.fileName.replace(/\//g, '\\');
  }
  var dirFileArray = msg.fileName.split(helpers.separator);
  var serverDir = msg.owner + "/" + dirFileArray[0];
  if (!helpers.connectedRepos[serverDir]) {
    // console.log("Connect-Repo - Error! Received an unknown file")
  } else {
    // else write file to the connected directory.
    // if file should be deleted, delete it
    if (msg.deleted) {
      fs.stat(helpers.connectedRepos[serverDir] + helpers.separator + msg.fileName, function(err, stats) {
        if (!stats) {
          return;
        }
        if (stats.isFile()) {
          fs.unlink(helpers.connectedRepos[serverDir] + helpers.separator + msg.fileName, function(err) {
            if (err) {
              return console.log(err);
            }
          });
        } else {
          helpers.rmdirRec(helpers.connectedRepos[serverDir] + helpers.separator + msg.fileName, "");
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
        fs.writeFile(helpers.connectedRepos[serverDir] + helpers.separator + msg.fileName, helpers.toBuffer(msg.fileContents), function(err) {
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
  $("#connectedRepos").prepend(
  "<tr>" +
    "<td class='connectedName' width='20%'>" + name + "</td>" +
    "<td class='connectedOwner' width='20%'>" + owner + "</td>" +
    "<td class='connectedStoringTo' width='40%'>" + storingTo + "</td>" +
    "<td width='20%'><div class='btn btn-danger stopConnecting stop-btn'><span class='fa fa-stop'></span></div></td>" +
  "</tr>"

  );
}

var addHeader = function() {
  $("#connectedReposHead").html(
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

var connectBtn = function() {
  $("#view-form-container").hide();
  $("#forms-container").show();
  $("#connect-form").attr("data", "showing");
  $("#connect-form input[name='owner']").focus();
  $("#main-container").css("opacity", "0.3");
  $("#empty-container").css("z-index", "50");
}

var connectFormShow = function() {
  var owner = $("#connect-form input[name='owner']").val();
  if (owner === "") return;
  $("#connect-form-spinner-container").show();
  socket.emit('show user folders', owner);
  if (helpers.connectFormShowing && helpers.connectFormShowing !== helpers.viewFormShowing) {
    socket.emit('disconnect user folders', helpers.connectFormShowing);
  }
  helpers.connectFormShowing = owner;
  userFolders = {};
  $("#connect-form input[name='owner']").val("");
  $("#connect-form-show-header").html(owner + "'s Repositories")
  $("#connect-form-show-container").html("");
}

$(function() {
  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      if ($(".active").find("a").html() === "Connect") {
        if ($("#connect-form").attr("data") === "hidden") {
          connectBtn();
        } else {
          connectFormShow();
        }
      }
    }
  });

  $("#connect-btn").on("click", connectBtn);

  $("#connect-form-show").on("click", connectFormShow);

  $("#connect-form-show-container").on("click", ".user-folder", function() {

    var t = this;

    dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
      if (!directoryNames) {
        return;
      } else {
        console.log("connecting to " + helpers.connectFormShowing + "/" + $(t).text());

        var serverFolder = helpers.connectFormShowing + "/" + $(t).text();

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

socket.on('send folder', function(msg) {
  if (connecting[msg.name]) {
    console.log(msg.name);
    helpers.connectedRepos[msg.name] = connecting[msg.name];
    arr = msg.name.split("/");

    addRow(arr[0], arr[1], connecting[msg.name]);

    if (numRepos === 0) {
      addHeader();
      $("#connect-help").hide();
    }
    numRepos++;


    delete connecting[msg.name];
  }
});

socket.on('send file', sendFile);

socket.on('send folder error', sendDirectoryError);

socket.on('user folder', function(msg) {
  if (msg.owner !== helpers.connectFormShowing) return;

  $("#connect-form-spinner-container").hide();
  $("#connect-form-show-container").show();

  if ($("#connect-form-show-error-message").length !== 0) {
    $("#connect-form-show-error-message").remove();
  }

  if (!userFolders[msg.name]) {
    $("#connect-form-show-container").append("<div class='user-folder'><span class='fa fa-folder' style='margin-right: 5px;'></span>" + msg.name + "</div>");
    userFolders[msg.name] = true;
  }
});

socket.on('delete user folder', function(msg) {
  if (msg.owner !== helpers.connectFormShowing) return;

  $("#connect-form-spinner-container").hide();
  $("#connect-form-show-container").show();

  $("#connect-form-show-container .user-folder:contains('" + msg.name + "')").remove();
  delete userFolders[msg.name];
});

socket.on('user folder empty', function(msg) {
  if (msg !== helpers.connectFormShowing) return;

  $("#connect-form-spinner-container").hide();
  $("#connect-form-show-container").show();

  $("#connect-form-show-container").html("<div id='connect-form-show-error-message' class='alert alert-danger'>This user has no repositories or does not exist</div>");
  userFolders = {};
});

socket.on('resend folders', function() {
  helpers.connectedRepos = {};
  $("#connectedRepos").html("");
  removeHeader();
  $("#connect-help").show();
  numRepos = 0;
});

}
