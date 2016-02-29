module.exports = function(helpers, historySizeLimit) {

var React = require('react');
var ReactDOM = require('react-dom');

var FileView = require('./file-view');

var socket = helpers.socket;

var userFolders = {};

// the server directory name after a user clicks on a repository name but before trying to connect
var tryingToView = false;

// true if the directory wasn't ready the first time we tried to connect
var tryingToConnect = false;

// true after loading bar has completed and directory has been received
var receivedDirectory = false;

// for loading bar
var filesRetrieved = 0;
var totalNumberOfFiles;

// for receiving files loading spinner
var receivingFiles = false;

// for history
var historyMessages = 0;
var historyScrolledToBottom = true;

var fileTree = {};

var resetView = function() {
  fileTree = {};
  tryingToView = false;
  tryingToConnect = false;
  receivedDirectory = false;
  filesRetrieved = 0;
  receivingFiles = false;
  historyMessages = 0;
  historyScrolledToBottom = true;
  $("#loading-view").html(
    "<i id='loading-spinner' class='fa fa-spinner fa-pulse'></i>"
  );
  $("#loading-view").hide();
  $("#hide-buttons-container").hide();
  $("#history-container").hide();
  $("#history-contents").html("");
  $("#file-view-container").html("");
}

// returns true if a new file is added, false if an existing file is changed, and null if nothing happens.
var addToFileTree = function(fileTree, fileNameArray, length, index, fileName, fileContents) {
  fileTree.name = fileNameArray[index];
  if (index === length - 1) {
    if (fileTree.fileContents === fileContents) {
      return null;
    }
    fileTree.fileContents = fileContents;
    if (fileTree.fullName) {
      return false;
    } else {
      fileTree.fullName = fileName;
      return true;
    }
  }
  if (!fileTree.childNodes) {
    fileTree.childNodes = [{name: fileNameArray[index + 1]}];
    return addToFileTree(fileTree.childNodes[0], fileNameArray, length, index + 1, fileName, fileContents);
  } else {
    var childrenLength = fileTree.childNodes.length;
    for (var i = 0; i < childrenLength; i++) {
      if (fileNameArray[index + 1] === fileTree.childNodes[i].name) {
        return addToFileTree(fileTree.childNodes[i], fileNameArray, length, index + 1, fileName, fileContents);
      }
    }
    fileTree.childNodes.push({name: fileNameArray[index + 1]});
    return addToFileTree(fileTree.childNodes[fileTree.childNodes.length - 1], fileNameArray, length, index + 1, fileName, fileContents);
  }
}

// returns true if file is removed, null otherwise
var removeFromFileTree = function(fileTree, fileNameArray, length, index) {
  if (fileTree.name !== fileNameArray[index]) {
    return null;
  }
  var childrenLength = fileTree.childNodes.length;
  for (var i = 0; i < childrenLength; i++) {
    if (fileNameArray[index + 1] === fileTree.childNodes[i].name) {
      if (index === length - 2) {
        fileTree.childNodes.splice(i, 1);
        return true;
      }
      return removeFromFileTree(fileTree.childNodes[i], fileNameArray, length, index + 1);
    }
  }
  return null;
}

var ab2str = function(buffer) {
  var bufView = new Uint8Array(buffer);
  var length = bufView.length;
  var result = "";
  for (var i = 0; i < length; i += 65535) {
      var addition = 65535;
      if (i + 65535 > length) {
          addition = length - i;
      }
      result += String.fromCharCode.apply(null, bufView.subarray(i,i+addition));
  }

  return result;

}

var sendDirectoryError = function(msg) {
  if (tryingToView) {
    tryingToView = false;

    $("#loading-view").hide();

    $("#view-messages").html(
      "<div class='alert alert-danger'>" +
      "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
      "Problem retrieving directory " + msg + ". The repository does not exist." +
      "</div>"
    );
  }
}

function updateHistoryScroll(){
  if (historyScrolledToBottom) {
    var element = document.getElementById("history-contents");
    element.scrollTop = element.scrollHeight - element.clientHeight;
  }
}

var addToHistory = function(fileName, addition, deletion) {
  var element = document.getElementById("history-contents");
  historyScrolledToBottom = element.scrollHeight - element.clientHeight <= element.scrollTop + 1;

  if (historyMessages < historySizeLimit) {
    historyMessages++;
  } else {
    $("#history-contents div:first").remove();
  }
  var date = new Date();
  var currentTime = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
  if (addition) {
    $("#history-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-addition'>New:</b>" +
        "<a class='history-message-file'>" + fileName + "</a>" +
        "<span class='history-message-timestamp'>" + currentTime + "</span>" +
      "</div>"
    )
  } else if (deletion) {
    $("#history-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-deletion'>Delete:</b>" +
        "<a class='history-message-file'>" + fileName + "</a>" +
        "<span class='history-message-timestamp'>" + currentTime + "</span>" +
      "</div>"
    )
  } else {
    $("#history-contents").append(
      "<div class='history-message'>" +
        "<b class='history-message-edit'>Edit:</b>" +
        "<a class='history-message-file'>" + fileName + "</a>" +
        "<span class='history-message-timestamp'>" + currentTime + "</span>" +
      "</div>"
    )
  }
  updateHistoryScroll();
}



var viewBtn = function() {
  $("#connect-form-container").hide();
  $("#forms-container").show();
  $("#view-form").attr("data", "showing");
  $("#view-form input[name='owner']").focus();
  $("#main-container").css("opacity", "0.3");
  $("#empty-container").css("z-index", "50");
}

var viewFormShow = function() {
  var owner = $("#view-form input[name='owner']").val();
  if (owner === "") return;
  $("#view-form-spinner-container").show();
  socket.emit('show user folders', owner);
  if (helpers.viewFormShowing && helpers.viewFormShowing !== helpers.connectFormShowing) {
    socket.emit('disconnect user folders', helpers.viewFormShowing);
  }
  helpers.viewFormShowing = owner;
  userFolders = {};
  $("#view-form input[name='owner']").val("");
  $("#view-form-show-header").html(owner + "'s Repositories")
  $("#view-form-show-container").html("");
}

$(function() {
  $("#history-container").on("click", ".history-message-file", function() {
    ReactDOM.render(<FileView node={fileTree} fullFileName={$(this).html()} />, document.getElementById('file-view-container'));
  });

  $("#hide-history").on("click", function() {
    if ($("#history-container").css("display") === "none") {
      $("#history-container").show("slide", {direction: "right"}, 1, function() {
        if ($("#fileTree").css("display") === "none") {
          $("#fileContents").css("width", "80%");
        } else {
          $("#fileContents").css("width", "60%");
        }
      });
      $(this).css("left", "80%");
      $(this).css("right", "");
      $(this).removeClass("fa-caret-left");
      $(this).addClass("fa-caret-right");
    } else {
      $("#history-container").hide("slide", {direction: "right"}, 1);

      if ($("#fileTree").css("display") === "none") {
        $("#fileContents").css("width", "100%");
      } else {
        $("#fileContents").css("width", "80%");
      }
      $(this).css("left", "");
      $(this).css("right", "5px");
      $(this).removeClass("fa-caret-right");
      $(this).addClass("fa-caret-left");
    }
  });

  $("#hide-fileTree").on("click", function() {
    if ($("#fileTree").css("display") === "none") {
      $("#fileTree").show("slide", {direction: "left"}, 1, function() {
        if ($("#history-container").css("display") === "none") {
          $("#fileContents").css("width", "80%");
        } else {
          $("#fileContents").css("width", "60%");
        }
        $("#fileContents").css("left", "20%")
      });
      $(this).css("right", "80%");
      $(this).css("left", "");
      $(this).removeClass("fa-caret-right");
      $(this).addClass("fa-caret-left");
    } else {
      $("#fileTree").hide("slide", {direction: "left"}, 1);

      if ($("#history-container").css("display") === "none") {
        $("#fileContents").css("width", "100%");
      } else {
        $("#fileContents").css("width", "80%");
      }
      $("#fileContents").css("left", "0px")
      $(this).css("right", "");
      $(this).css("left", "5px");
      $(this).removeClass("fa-caret-left");
      $(this).addClass("fa-caret-right");
    }
  });

  $("#hide-buttons-container").on("mouseenter", function() {
    $("#hide-history").show();
    $("#hide-fileTree").show();
  }).on("mouseleave", function() {
    $("#hide-history").hide();
    $("#hide-fileTree").hide();
  });

  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      if ($(".active").find("a").html() === "View") {
        if ($("#view-form").attr("data") === "hidden") {
          viewBtn();
        } else {
          viewFormShow();
        }
      }
    }
  });

  $("#view-btn").on("click", viewBtn);

  $("#view-form-show").on("click", viewFormShow);

  $("#view-form-show-container").on("click", ".user-folder", function() {
    tryingToView = helpers.viewFormShowing + "/" + $(this).text();
    console.log("trying to view " + tryingToView);
    socket.emit('connect folder', tryingToView);

    resetView();
    $("#loading-view").show();

    $("#forms-container").hide();
    $("#view-form").attr("data", "hidden");
    $("#main-container").css("opacity", "1");
    $("#empty-container").css("z-index", "-50");
  });

});

socket.on('send folder', function(msg) {
  if (tryingToView) {
    var arr = msg.name.split("/");
    $("#view-header").html(msg.name);

    if (helpers.viewServerFolder && !helpers.connectedRepos[helpers.viewServerFolder]) {
      socket.emit('disconnect folder', helpers.viewServerFolder)
    }
    helpers.viewServerFolder = msg.name;
    tryingToView = false;
    $("#view-help").hide();

    totalNumberOfFiles = msg.numberOfFiles;
    $("#loading-view").html(
      "<div>Loading...</div>" +
      "<div id='progress-bar'></div>"
    );
    $("#progress-bar").progressbar({max: totalNumberOfFiles})
  }
});

socket.on('sent folder', function(msg) {
  receivedDirectory = true;
  ReactDOM.render(<FileView node={fileTree} />, document.getElementById('file-view-container'));
  $("#loading-view").hide();
  $("#history-container").show();
  $("#hide-buttons-container").show();
});

socket.on('send subfolder', function(msg) {
  receivingFiles = true;
  $("#receiving-files-spinner").show();
});

socket.on('sent subfolder', function(msg) {
  receivingFiles = false;
  $("#receiving-files-spinner").hide();
  ReactDOM.render(<FileView node={fileTree} />, document.getElementById('file-view-container'));
});

socket.on('send file', function(msg){
  msg = JSON.parse(msg);
  if (msg.fileContents) msg.fileContents = new Uint8Array(msg.fileContents.data).buffer;

  if (helpers.separator === "\\") {
    msg.fileName = msg.fileName.replace(/\//g, '\\');
  }
  var fileNameArray = msg.fileName.split(helpers.separator);
  if (msg.owner + "/" + fileNameArray[0] !== helpers.viewServerFolder) {
    console.log(msg.owner + "/" + fileNameArray[0] + " is not equal to viewing folder " + helpers.viewServerFolder);
    return;
  }

  var added;
  var changed;
  var deleted;
  if (msg.deleted) {
    changed = removeFromFileTree(fileTree, fileNameArray, fileNameArray.length, 0);
    deleted = true;
  } else {
    changed = addToFileTree(fileTree, fileNameArray, fileNameArray.length, 0, msg.fileName, ab2str(msg.fileContents));
    if (changed) added = true;
    else if (changed === false) changed = true;
  }

  if (changed && receivedDirectory && !receivingFiles) {
    ReactDOM.render(<FileView node={fileTree} />, document.getElementById('file-view-container'));
    if (fileNameArray[fileNameArray.length - 1] !== ".DS_Store")
      addToHistory(msg.fileName, added, deleted);
  } else if (!receivingFiles) {
    filesRetrieved++;
    $("#progress-bar").progressbar("value", filesRetrieved);
  } else {
    if (fileNameArray[fileNameArray.length - 1] !== ".DS_Store")
      addToHistory(msg.fileName, added, deleted);
  }
});

// if not ready keep trying to connect ever second until it is ready
socket.on('folder not ready', function() {
  if (tryingToView) {
    if (!tryingToConnect) {
      $("#loading-view").prepend(
        "<div>Waiting for repository to be ready...</div>"
      );
    }
    tryingToConnect = true;

    setTimeout(function() {
      socket.emit('connect folder', tryingToView);
    }, 1000);
  }
});

socket.on('send folder error', sendDirectoryError);

socket.on('user folder', function(msg) {
  if (msg.owner !== helpers.viewFormShowing) return;

  $("#view-form-spinner-container").hide();
  $("#view-form-show-container").show();

  if ($("#view-form-show-error-message").length !== 0) {
    $("#view-form-show-error-message").remove();
  }

  if (!userFolders[msg.name]) {
    $("#view-form-show-container").append("<div class='user-folder'><span class='fa fa-folder' style='margin-right: 5px;'></span>" + msg.name + "</div>");
    userFolders[msg.name] = true;
  }
});

socket.on('delete user folder', function(msg) {
  if (msg.owner !== helpers.viewFormShowing) return;

  $("#view-form-spinner-container").hide();
  $("#view-form-show-container").show();

  $("#view-form-show-container .user-folder:contains('" + msg.name + "')").remove();
  delete userFolders[msg.name];
});

socket.on('user folder empty', function(msg) {
  if (msg !== helpers.viewFormShowing) return;

  $("#view-form-spinner-container").hide();
  $("#view-form-show-container").show();

  $("#view-form-show-container").html("<div id='view-form-show-error-message' class='alert alert-danger'>This user has no repositories or does not exist</div>");
  userFolders = {};
});

socket.on('resend folders', function() {
  resetView();
});

}
