module.exports = function(helpers) {

var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var ipc = require('electron').ipcRenderer;

var socket = helpers.socket;
helpers.numBroadcastingRepos = 0;

var resetBroadcastRows = function() {
  var directoryNameArray = [];
  for (var key in helpers.broadcastingRepos) {
    if (helpers.broadcastingRepos.hasOwnProperty(key)) {
      directoryNameArray.push(key);
    }
  }

  directoryNameArray.forEach(function(chosenDirectoryName) {
    $("#broadcast-loading-bar-container-" + chosenDirectoryName).html(
      "<div>broadcasting...</div>" +
      "<div id='broadcast-progress-bar-" + chosenDirectoryName + "'></div>"
    );
    $("#broadcast-progress-bar-" + chosenDirectoryName).progressbar({max: 0});

    $("#broadcast-stats-" + chosenDirectoryName + " .broadcast-stats-files").html("0");
    $("#broadcast-stats-" + chosenDirectoryName + " .broadcast-stats-size").html("0.00");

    helpers.broadcastingRepos[chosenDirectoryName].totalInitialFiles = 0;

    // let server know we are sending a directory
    socket.emit('send folder', chosenDirectoryName);

    helpers.sendDirectory(helpers.broadcastingRepos[chosenDirectoryName].fullDirectoryName, "", chosenDirectoryName, function(err) {
      // let server know entire directory has been sent
      socket.emit('sent folder', chosenDirectoryName);
    });
  });
}

var addRow = function(directoryName, chosenDirectoryName) {
  $("#broadcastingRepos").append(
  "<tr>" +
    "<td id='broadcast-name-" + chosenDirectoryName + "' class='broadcastName' width='50%'>" + directoryName + "</td>" +
    "<td id='broadcast-loading-bar-container-" + chosenDirectoryName + "' width='20%'>" +
      "<div>broadcasting...</div>" +
      "<div id='broadcast-progress-bar-" + chosenDirectoryName + "'></div>" +
    "</td>" +
    "<td id='broadcast-stats-" + chosenDirectoryName + "' width='10%'>" +
      "<div>Files: <span class='broadcast-stats-files'>0</span></div>" +
      "<div>Size: <span class='broadcast-stats-size'>0.00</span>MB</div>" +
    "</td>" +
    "<td width='20%'><div class='btn btn-danger stopBroadcasting stop-btn'><span class='fa fa-stop'></span></div></td>" +
  "</tr>"
  );

  $("#broadcast-progress-bar-" + chosenDirectoryName).progressbar({max: 0});
}

var addHeader = function() {
  $("#broadcastingReposHead").html(
    "<tr>" +
      "<th width='80%'>Name</th>" +
      "<th width='20%'>Stop Broadcasting?</th>" +
    "</tr>"
  );
}

var removeHeader = function() {
  $("#broadcastingReposHead").html("");
}

var broadcastRepo = function() {
  dialog.showOpenDialog({ properties: ['openDirectory']}, function(directoryNames) {
    var directoryNameArray = directoryNames[0].split(helpers.separator);
    var chosenDirectoryName = directoryNameArray[directoryNameArray.length - 1];

    var watchOnEvent = function(event, fileName) {
      // check if fileName contains .git
      var fileNameArray = fileName.split(helpers.separator);
      var length = fileNameArray.length;
      for (var i = 0; i < length; i++) {
        if (fileNameArray[i] === ".git") return;
      }

      fs.stat(directoryNames[0] + helpers.separator + fileName, function(err, stats) {
        if (helpers.broadcastingRepos[chosenDirectoryName].gitignore && helpers.broadcastingRepos[chosenDirectoryName].gitignore.denies(fileName)) {
          console.log("denied " + fileName);
          return;
        }
        if (err) {
          // nonexistent so delete from server
          helpers.deleteFileFromServer(directoryNames[0], fileName);
        } else if (stats.isFile() && stats.size > helpers.maxFileSize) {
          $("#broadcast-messages").html(
            "<div class='alert alert-danger'>" +
            "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
            fileName + " is over " + helpers.maxFileSize / 1048576 + "MB and can't be sent." +
            "</div>"
          );
        } else {
          // send to server
          if (stats.isFile()) {
            fs.readFile(directoryNames[0] + helpers.separator + fileName, function(err, data) {
              if (err) {
                console.log(err);
              }
              helpers.sendFileToServer(directoryNames[0], fileName, data);
            });
          } else {
            if (fileName !== ".git") {
              helpers.sendDirectory(directoryNames[0], fileName);
            }
          }
        }
      });
    }

    if (!directoryNames) {
      return;
    } else {
      if (helpers.broadcastingRepos[chosenDirectoryName]) {
        $("#broadcast-messages").html(
          "<div class='alert alert-danger'>" +
          "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
          "The repository " + chosenDirectoryName + " is already being broadcasted" +
          "</div>"
        );
      } else {
        console.log("Listening to " + directoryNames[0]);

        // let server know we are sending a directory
        socket.emit('send folder', chosenDirectoryName);

        if (helpers.numBroadcastingRepos === 0) {
          addHeader();
          $("#broadcast-help").hide();
        }
        helpers.numBroadcastingRepos++;

        addRow(directoryNames[0], chosenDirectoryName);

        // totalInitialFiles is for the loading bar displaying when the folder is first uploaded to the server
        helpers.broadcastingRepos[chosenDirectoryName] = {fullDirectoryName: directoryNames[0], sentDirectory: false, totalInitialFiles: 0};

        helpers.sendDirectory(directoryNames[0], "", chosenDirectoryName, function(err) {
          // let server know entire directory has been sent
          socket.emit('sent folder', chosenDirectoryName);
        });

        helpers.broadcastingRepos[chosenDirectoryName].watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, watchOnEvent);
      }
    }
  });
}

var broadcastBtn = function() {
  if (helpers.loggedIn) {
    broadcastRepo();
  } else {
    ipc.send('open-login-window');
  }
}

$(function() {
  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      if ($(".active").find("a").html() === "Broadcast") {
        broadcastBtn();
      }
    }
  });

  $("#broadcast-btn").on("click", broadcastBtn);

  $("#broadcastingRepos").on("click", ".stopBroadcasting", function() {
    var broadcastName = $(this).parent().parent().find(".broadcastName").html()
    var arr = broadcastName.split(helpers.separator);
    var chosenDirectoryName = arr[arr.length - 1];

    if (helpers.broadcastingRepos[chosenDirectoryName]) {
      if (helpers.broadcastingRepos[chosenDirectoryName].watcher) {
        helpers.broadcastingRepos[chosenDirectoryName].watcher.close();
      }
      delete helpers.broadcastingRepos[chosenDirectoryName];
    }

    console.log('deleting folder from server: ' + chosenDirectoryName);

    socket.emit('delete folder', chosenDirectoryName);

    $(this).parent().parent().remove();

    if (helpers.numBroadcastingRepos === 1) {
      removeHeader();
      $("#broadcast-help").show();
    }
    helpers.numBroadcastingRepos--;
  });
});

socket.on('directory stats', function(msg) {
  if ($("#broadcast-progress-bar-" + msg.directoryName).length !== 0) {
    $("#broadcast-progress-bar-" + msg.directoryName).progressbar("value", msg.numberOfFiles);
  }
  var sizeInMB = msg.directorySize / 1048576;

  $("#broadcast-stats-" + msg.directoryName + " .broadcast-stats-files").html(msg.numberOfFiles);
  $("#broadcast-stats-" + msg.directoryName + " .broadcast-stats-size").html(sizeInMB.toFixed(2));
});

socket.on('folder sent successfully', function(msg) {
  $("#broadcast-loading-bar-container-" + msg).html("");
});

socket.on('max files allowed', function(msg) {
  $("#broadcast-messages").html(
    "<div class='alert alert-danger'>" +
    "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
    "You have reached the maximum file limit of " + msg + " files. One or more files were not saved on the server." +
    "</div>"
  );
});

socket.on('max directory size allowed', function(msg) {
  var sizeInMB = msg / 1048576;
  $("#broadcast-messages").html(
    "<div class='alert alert-danger'>" +
    "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
    "You have reached the maximum limit of " + sizeInMB + "MB. One or more files were not saved on the server." +
    "</div>"
  );
});

socket.on('resend folders', function() {
  resetBroadcastRows();
});

socket.on('user stats', function(msg) {
  $("#broadcast-stats-files").html(msg.totalNumberOfFiles);
  $("#broadcast-stats-size").html((msg.totalDirectorySize / 1048576).toFixed(2));
});

}
