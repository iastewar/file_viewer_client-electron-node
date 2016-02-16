module.exports = function(helpers) {

var React = require('react');
var ReactDOM = require('react-dom');

var socket = helpers.socket;

var userFolders = {};

var tryingToView = false;
var filesRetrieved = 0;
var totalNumberOfFiles;

var TreeNode = React.createClass({
  getInitialState: function() {
    return {visible: false, open: false};
  },
  toggle: function() {
    this.setState({visible: !this.state.visible});
    this.setState({open: !this.state.open});
    if (this.props.node.fileContents) {
      this.props.notifyParent(this.props.node.name, this.props.node.fileContents, this.props.node.fullName);
    }
  },
  render: function() {
    var childNodes;
    var t = this;
    if (this.props.node.childNodes) {
      childNodes = this.props.node.childNodes.map(function(node, index) {
        return <div key={index}><TreeNode node={node} selectedFile={t.props.selectedFile} notifyParent={t.props.notifyParent} depth={t.props.depth + 1}/></div>
      });
    }

    var childStyle = {};
    if (!this.state.visible) {
      childStyle = {display: "none"};
    }

    var folderClass;
    var caretClass;
    if (this.state.open) {
      folderClass = "fa fa-folder-open";
      caretClass = "fa fa-caret-down";
    } else {
      folderClass = "fa fa-folder";
      caretClass = "fa fa-caret-right";
    }

    var style = {};
    if (this.props.node.fullName === this.props.selectedFile) {
      style = {padding: "1px 15px 1px 15px", backgroundColor: "#454b54", cursor: "default", color: "white", borderTop: "1px solid black", borderBottom: "1px solid black"}
    } else {
      style = {padding: "1px 15px 1px 15px", cursor: "default"}
    }

    var node;
    if (this.props.node.childNodes) {
      node = <div className={caretClass}> <div className={folderClass}> {this.props.node.name}</div></div>;
    } else {
      node = <div className="fa fa-file-text-o"> {this.props.node.name}</div>;
    }

    var space = "";
    for (var i = 0; i < this.props.depth; i++) {
      space += "\u2003 \u2002"
    }

    return (
      <div>
        <div onClick={this.toggle} style={style} className="backgroundDiv">
          {space}
          {node}
        </div>
        <div style={childStyle}>
          {childNodes}
        </div>
      </div>
    );
  }
});

var FileView = React.createClass({
  componentDidMount: function () {
    this.highlightCode();
  },
  componentDidUpdate: function () {
    this.highlightCode();
  },
  highlightCode: function () {
    var domNode = ReactDOM.findDOMNode(this);
    var nodes = domNode.querySelectorAll('pre code');
    for (var i = 0; i < nodes.length; i++) {
      var fileNameArray = nodes[i].className.split(".");
      if (fileNameArray.length > 1) {
        var ext = fileNameArray[fileNameArray.length - 1];
        switch (ext) {
          case "rb":
            nodes[i].className = "rb";
            break;
          case "yml":
            nodes[i].className = "yml";
            break;
          case "js":
            nodes[i].className = "js";
            break;
          case "java":
            nodes[i].className = "java";
            break;
          case "css":
            nodes[i].className = "css";
            break;
          case "cs":
            nodes[i].className = "cs";
            break;
          case "cpp":
          case "c":
          case "h":
            nodes[i].className = "cpp";
            break;
          case "coffee":
            nodes[i].className = "coffee";
            break;
          case "http":
            nodes[i].className = "http";
            break;
          case "erb":
            nodes[i].className = "erb";
            break;
          case "json":
            nodes[i].className = "json";
            break;
          default:
            nodes[i].className = "";
        }
      }

      hljs.highlightBlock(nodes[i]);
    }
  },
  getInitialState: function() {
    return {fileName: "No file selected", fileContents: "", fullFileName: ""}
  },
  swapView: function(fileName, fileContents, fullFileName) {
    this.setState({fileName: fileName});
    this.setState({fileContents: fileContents});
    this.setState({fullFileName: fullFileName});
  },
  componentWillReceiveProps: function() {
    var findContents = function(node, fullFileName) {
      if (node.fullName === fullFileName) {
        return node.fileContents;
      }
      if (!node.childNodes) {
        return;
      }
      var childrenLength = node.childNodes.length;
      for (var i = 0; i < childrenLength; i++) {
        var fileContents = findContents(node.childNodes[i], fullFileName);
        if (fileContents) {
          return fileContents;
        }
      }
    }

    this.setState({fileContents: findContents(this.props.node, this.state.fullFileName)});
  },
  render: function() {

    var lineNumbers = [];
    if (this.state.fileContents) {
      var lines = this.state.fileContents.split("\n");
      var len = lines.length;
      for (var i = 0; i < len; i++) {
        lineNumbers.push(<div key={i} className="line-number">{i+1}</div>);
      }
    }


    return <div id="fileView">
            <div id="fileTree">
              <div id="fixed-fileTree">
                <TreeNode node={this.props.node} selectedFile={this.state.fullFileName} notifyParent={this.swapView} depth={0}/>
              </div>
            </div>
            <div id="fileContents">
              <pre><div className="lines">{lineNumbers}</div><code className={this.state.fileName}>{this.state.fileContents}</code></pre>
            </div>
          </div>
  }
});

var fileTree = {};

var addToFileTree = function(fileTree, fileNameArray, length, index, fileName, fileContents) {
  fileTree.name = fileNameArray[index];
  if (index === length - 1) {
    if (fileTree.fileContents === fileContents) {
      return null;
    }
    fileTree.fileContents = fileContents;
    fileTree.fullName = fileName;
    return true;
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
    $("#view-messages").html(
      "<div class='alert alert-danger'>" +
      "<button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>" +
      "Problem retrieving directory " + msg + ". Either repository does not exist, or the server is experiencing problems." +
      "</div>"
    );
  }
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
  socket.emit('show user folders', owner);
  if (helpers.viewFormShowing && helpers.viewFormShowing !== helpers.connectFormShowing) {
    socket.emit('disconnect user folders', helpers.viewFormShowing);
  }
  helpers.viewFormShowing = owner;
  userFolders = {};
  $("#view-form input[name='owner']").val("");
  $("#view-form-show-header").html(owner + "'s Repositories")
  $("#view-form-show-container").show().html("");
}

$(function() {
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
    console.log("trying to view " + helpers.viewFormShowing + "/" + $(this).text());
    tryingToView = true;
    socket.emit('connect folder', helpers.viewFormShowing + "/" + $(this).text());
    $("#forms-container").hide();
    $("#view-form").attr("data", "hidden");
    $("#main-container").css("opacity", "1");
    $("#empty-container").css("z-index", "-50");
  });

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
  var changed;
  if (msg.deleted) {
    changed = removeFromFileTree(fileTree, fileNameArray, fileNameArray.length, 0);
  } else {
    changed = addToFileTree(fileTree, fileNameArray, fileNameArray.length, 0, msg.fileName, ab2str(msg.fileContents));
  }

  if (changed && filesRetrieved >= totalNumberOfFiles - 1) {
    ReactDOM.render(<FileView node={fileTree} />, document.getElementById('viewingRepos'));
  } else {
    filesRetrieved++;
    $("#progress-bar").progressbar("value", filesRetrieved);
  }
});

socket.on('connected', function(msg) {
  if (tryingToView) {
    fileTree = {};
    var arr = msg.name.split("/");
    $("#view-header").html(arr[0]);

    if (helpers.viewServerFolder && !helpers.connectedRepos[helpers.viewServerFolder]) {
      socket.emit('disconnect folder', helpers.viewServerFolder)
    }
    helpers.viewServerFolder = msg.name;
    tryingToView = false;
    $("#view-help").hide();

    filesRetrieved = 0;
    totalNumberOfFiles = msg.numberOfFiles;
    $("#viewingRepos").html(
      "<div id='loading-view'>" +
      "<div>Loading...</div>" +
      "<div id='progress-bar'></div>" +
      "</div>"
    );
    $("#progress-bar").progressbar({max: totalNumberOfFiles})
  }
});

socket.on('send directory error', sendDirectoryError);

socket.on('user folder', function(msg) {
  if (msg.owner !== helpers.viewFormShowing) return;

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

  $("#view-form-show-container .user-folder:contains('" + msg.name + "')").remove();
  delete userFolders[msg.name];
});

socket.on('user folder empty', function(msg) {
  if (msg !== helpers.viewFormShowing) return;

  $("#view-form-show-container").html("<div id='view-form-show-error-message' class='alert alert-danger'>This user has no repositories or does not exist</div>");
  userFolders = {};
});

}
