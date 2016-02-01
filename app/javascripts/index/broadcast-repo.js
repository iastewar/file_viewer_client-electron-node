module.exports = function(helpers) {

var fs = require('fs');
var remote = require('remote');
var dialog = remote.require('dialog');
var ipc = require('electron').ipcRenderer;

var socket = helpers.socket;
helpers.numBroadcastingRepos = 0;

var addRow = function(directoryName) {
  $("#broadcastingRepos").append(
  "<tr>" +
    "<td class='broadcastName' width='80%'>" + directoryName + "</td>" +
    "<td width='20%'><div class='btn btn-danger stopBroadcasting stop-btn'><span class='fa fa-stop'></span></div></td>" +
  "</tr>"

  );
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

    var watchOnEvent = function(event, fileName) {
      fs.stat(directoryNames[0] + helpers.separator + fileName, function(err, stats) {
        if (helpers.broadcastingRepos[directoryNames[0]].gitignore && helpers.broadcastingRepos[directoryNames[0]].gitignore.denies(fileName)) {
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
            helpers.sendDirectory(directoryNames[0], fileName);
          }
        }
      });
    }

    if (!directoryNames) {
      return;
    } else {
      if (helpers.broadcastingRepos[directoryNames[0]]) {
        $("#broadcast-messages").html(
          "<div class='alert alert-danger'>" +
          "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
          "The repository " + directoryNames[0] + " is already being broadcasted" +
          "</div>"
        );
      } else {
        console.log("Listening to " + directoryNames[0]);

        helpers.broadcastingRepos[directoryNames[0]] = {sentDirectory: false};

        helpers.sendDirectory(directoryNames[0], "");

        if (helpers.numBroadcastingRepos === 0) {
          addHeader();
          $("#broadcast-help").hide();
        }
        helpers.numBroadcastingRepos++;

        addRow(directoryNames[0]);

        helpers.broadcastingRepos[directoryNames[0]].watcher = fs.watch(directoryNames[0], { persistent: true, recursive: true }, watchOnEvent);
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

    if (helpers.broadcastingRepos[broadcastName]) {
      if (helpers.broadcastingRepos[broadcastName].watcher) {
        helpers.broadcastingRepos[broadcastName].watcher.close();
      }
      delete helpers.broadcastingRepos[broadcastName];
    }

    var arr = broadcastName.split(helpers.separator);

    console.log('deleting folder from server: ' + arr[arr.length - 1]);

    socket.emit('delete folder', arr[arr.length - 1]);

    $(this).parent().parent().remove();

    if (helpers.numBroadcastingRepos === 1) {
      removeHeader();
      $("#broadcast-help").show();
    }
    helpers.numBroadcastingRepos--;
  })
})

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
  for (var key in helpers.broadcastingRepos) {
    if (helpers.broadcastingRepos.hasOwnProperty(key)) {
      helpers.sendDirectory(key, "");
    }
  }
});

}
