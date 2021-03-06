module.exports = function(helpers) {

var fs = require('graceful-fs')
var remote = require('remote');
var dialog = remote.require('dialog');
var ipc = require('electron').ipcRenderer;

var socket = helpers.socket;
helpers.numBroadcastingRepos = 0;

// converts a string with spaces to an id by replacing all spaces with a : and returns
// the new string (we use ':' since it doesn't interfere with directory names)
var convertToId = function(s) {
  return s.replace(/\s/g, ":");
}

// converts an html id to one that jquery will accept as a selector
var convertToJq = function(id) {
  return id.replace( /(:|\.|\[|\]|,)/g, "\\$1" );
}

var showProgressBar = function(chosenDirectoryNameId) {
  var chosenDirectoryNameIdJq = convertToJq(chosenDirectoryNameId);
  $("#broadcast-loading-bar-container-" + chosenDirectoryNameIdJq).html(
    "<div>broadcasting...</div>" +
    "<div id='broadcast-progress-bar-" + chosenDirectoryNameId + "'></div>"
  );
  $("#broadcast-progress-bar-" + chosenDirectoryNameIdJq).progressbar({max: 0});
}

var resetBroadcastRows = function() {
  var directoryNameArray = [];
  for (var key in helpers.broadcastingRepos) {
    if (helpers.broadcastingRepos.hasOwnProperty(key)) {
      directoryNameArray.push(key);
    }
  }

  directoryNameArray.forEach(function(chosenDirectoryName) {
    var chosenDirectoryNameId = convertToId(chosenDirectoryName);
    var chosenDirectoryNameIdJq = convertToJq(chosenDirectoryNameId);

    showProgressBar(chosenDirectoryNameId);

    $("#broadcast-stats-" + chosenDirectoryNameIdJq + " .broadcast-stats-files").html("0");
    $("#broadcast-stats-" + chosenDirectoryNameIdJq + " .broadcast-stats-size").html("0.00");

    helpers.broadcastingRepos[chosenDirectoryName].totalInitialFiles = 0;

    helpers.broadcastingRepos[chosenDirectoryName].broadcastsInProgress = 1;
    // let server know we are sending a directory
    socket.emit('send folder', chosenDirectoryName);

    helpers.sendDirectory(helpers.broadcastingRepos[chosenDirectoryName].fullDirectoryName, "", chosenDirectoryName, chosenDirectoryNameIdJq, function(err) {
      // let server know entire directory has been sent
      socket.emit('sent folder', chosenDirectoryName);
    });
  });
}

var addRow = function(directoryName, chosenDirectoryName) {
  var chosenDirectoryNameId = convertToId(chosenDirectoryName);
  var chosenDirectoryNameIdJq = convertToJq(chosenDirectoryNameId);

  $("#broadcastingRepos").prepend(
  "<tr>" +
    "<td id='broadcast-name-" + chosenDirectoryNameId + "' class='broadcastName' width='50%'>" + directoryName + "</td>" +
    "<td id='broadcast-loading-bar-container-" + chosenDirectoryNameId + "' width='15%'>" +
      "<div>broadcasting...</div>" +
      "<div id='broadcast-progress-bar-" + chosenDirectoryNameId + "'></div>" +
    "</td>" +
    "<td id='broadcast-stats-" + chosenDirectoryNameId + "' width='15%'>" +
      "<div>Files: <span class='broadcast-stats-files'>0</span></div>" +
      "<div>Size: <span class='broadcast-stats-size'>0.00</span>MB</div>" +
    "</td>" +
    "<td width='20%'><div class='btn btn-danger stopBroadcasting stop-btn'><span class='fa fa-stop'></span></div></td>" +
  "</tr>"
  );

  $("#broadcast-progress-bar-" + chosenDirectoryNameIdJq).progressbar({max: 0});
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
    if (!directoryNames) return;

    var directoryNameArray = directoryNames[0].split(helpers.separator);
    var chosenDirectoryName = directoryNameArray[directoryNameArray.length - 1];
    var chosenDirectoryNameId = convertToId(chosenDirectoryName);
    var chosenDirectoryNameIdJq = convertToJq(chosenDirectoryNameId);

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
          } else if (stats.isDirectory()){  // simulate sending a repository
            // if we have no broadcasts in progress show the progress bar, and remember the number of files in the directory at this time.
            if (helpers.broadcastingRepos[chosenDirectoryName].broadcastsInProgress === 0) {
              showProgressBar(chosenDirectoryName);
              helpers.broadcastingRepos[chosenDirectoryName].oldNumberOfFiles = helpers.broadcastingRepos[chosenDirectoryName].numberOfFiles;
            }
            helpers.broadcastingRepos[chosenDirectoryName].broadcastsInProgress++;

            socket.emit('send subfolder', chosenDirectoryName);

            helpers.sendDirectory(directoryNames[0], fileName, chosenDirectoryName, chosenDirectoryNameIdJq, function(err) {
              socket.emit('sent subfolder', chosenDirectoryName);
            });
          }
        }
      });
    }

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
      helpers.broadcastingRepos[chosenDirectoryName] = {fullDirectoryName: directoryNames[0], sentDirectory: false, totalInitialFiles: 0, numberOfFiles: 0, directorySize: 0, broadcastsInProgress: 1, oldNumberOfFiles: 0};

      helpers.sendDirectory(directoryNames[0], "", chosenDirectoryName, chosenDirectoryNameIdJq, function(err) {
        // let server know entire directory has been sent
        socket.emit('sent folder', chosenDirectoryName);
      });

      helpers.broadcastingRepos[chosenDirectoryName].watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, watchOnEvent);
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
  if (!helpers.broadcastingRepos[msg.directoryName]) return;

  var chosenDirectoryNameId = convertToId(msg.directoryName);
  var chosenDirectoryNameIdJq = convertToJq(chosenDirectoryNameId);

  if ($("#broadcast-progress-bar-" + chosenDirectoryNameIdJq).length !== 0) {
    // get the difference of the new number of files and previous and update the progress bar max accordingly
    var difference = msg.numberOfFiles - helpers.broadcastingRepos[msg.directoryName].numberOfFiles - 1;
    var currentMax = $("#broadcast-progress-bar-" + chosenDirectoryNameIdJq).progressbar( "option", "max" );
    $("#broadcast-progress-bar-" + chosenDirectoryNameIdJq).progressbar({max: (currentMax + difference)});

    $("#broadcast-progress-bar-" + chosenDirectoryNameIdJq).progressbar("value", msg.numberOfFiles - helpers.broadcastingRepos[msg.directoryName].oldNumberOfFiles);
    // console.log((msg.numberOfFiles - helpers.broadcastingRepos[msg.directoryName].oldNumberOfFiles) + " / " + helpers.broadcastingRepos[msg.directoryName].totalInitialFiles);
  }
  var sizeInMB = msg.directorySize / 1048576;

  $("#broadcast-stats-" + chosenDirectoryNameIdJq + " .broadcast-stats-files").html(msg.numberOfFiles);
  $("#broadcast-stats-" + chosenDirectoryNameIdJq + " .broadcast-stats-size").html(sizeInMB.toFixed(2));

  helpers.broadcastingRepos[msg.directoryName].numberOfFiles = msg.numberOfFiles;
  helpers.broadcastingRepos[msg.directoryName].directorySize = msg.directorySize;
});

socket.on('folder sent successfully', function(msg) {
  if (!helpers.broadcastingRepos[msg]) return;

  var chosenDirectoryNameId = convertToId(msg);
  var chosenDirectoryNameIdJq = convertToJq(chosenDirectoryNameId);

  helpers.broadcastingRepos[msg].broadcastsInProgress--;
  if (helpers.broadcastingRepos[msg].broadcastsInProgress === 0) {
    $("#broadcast-loading-bar-container-" + chosenDirectoryNameIdJq).html("");
    helpers.broadcastingRepos[msg].totalInitialFiles = 0;
  }
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
