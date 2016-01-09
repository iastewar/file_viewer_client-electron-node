var socket = require('../socket');
var React = require('react');
var ReactDOM = require('react-dom');
var ipc = require('electron').ipcRenderer;

// seperator is "/" for mac and linux, and "\\" for windows
var seperator = "/";
if (process.platform === 'win32') {
  seperator = "\\"
}

var serverFolder;
var tryingToView = false;

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
      nodes[i].className = "";
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
              <pre><div className="lines">{lineNumbers}</div><code>{this.state.fileContents}</code></pre>
            </div>
          </div>
  }
});

var fileTree = {};

var addToFileTree = function(fileTree, fileNameArray, length, index, fileName, fileContents) {
  fileTree.name = fileNameArray[index];
  if (index === length - 1) {
    fileTree.fileContents = fileContents;
    fileTree.fullName = fileName;
    return;
  }
  if (!fileTree.childNodes) {
    fileTree.childNodes = [{name: fileNameArray[index + 1]}];
    addToFileTree(fileTree.childNodes[0], fileNameArray, length, index + 1, fileName, fileContents);
  } else {
    var flag = false;
    var childrenLength = fileTree.childNodes.length;
    for (var i = 0; i < childrenLength; i++) {
      if (fileNameArray[index + 1] === fileTree.childNodes[i].name) {
        addToFileTree(fileTree.childNodes[i], fileNameArray, length, index + 1, fileName, fileContents);
        flag = true;
      }
    }
    if (!flag) {
      fileTree.childNodes.push({name: fileNameArray[index + 1]});
      addToFileTree(fileTree.childNodes[fileTree.childNodes.length - 1], fileNameArray, length, index + 1, fileName, fileContents);
    }
  }
}

var removeFromFileTree = function(fileTree, fileNameArray, length, index) {
  if (fileTree.name !== fileNameArray[index]) {
    return false;
  }
  var flag = false;
  var childrenLength = fileTree.childNodes.length;
  for (var i = 0; i < childrenLength; i++) {
    if (fileNameArray[index + 1] === fileTree.childNodes[i].name) {
      if (index === length - 2) {
        fileTree.childNodes.splice(i, 1);
        return true;
      }
      removeFromFileTree(fileTree.childNodes[i], fileNameArray, length, index + 1);
      flag = true;
    }
  }
  if (!flag) {
    return false;
  }
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

$(function() {
  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      if ($(".active").find("a").html() === "View") {
        ipc.send('open-view-window');
      }
    }
  });

  $("#view-btn").on("click", function() {
    ipc.send('open-view-window');
  });
});


socket.on('send file', function(msg){
  if (seperator === "\\") {
    msg.fileName = msg.fileName.replace(/\//g, '\\');
  }
  var fileNameArray = msg.fileName.split(seperator);
  if (msg.owner + "/" + fileNameArray[0] !== serverFolder) {
    console.log(msg.owner + "/" + fileNameArray[0] + " is not equal to viewing folder " + serverFolder);
    return;
  }
  if (msg.deleted) {
    removeFromFileTree(fileTree, fileNameArray, fileNameArray.length, 0);
  } else {
    addToFileTree(fileTree, fileNameArray, fileNameArray.length, 0, msg.fileName, ab2str(msg.fileContents));
    ReactDOM.render(<FileView node={fileTree} />, document.getElementById('viewingRepos'));
  }
});

ipc.on('viewing', function(event, args) {
  console.log("trying to view " + args.owner + "/" + args.name);
  tryingToView = true;
  socket.emit('connect folder', args.owner + "/" + args.name);
});

socket.on('connected', function(msg) {
  if (tryingToView) {
    fileTree = {};
    var arr = msg.split("/");
    $("#view-header").html(arr[0]);
    serverFolder = msg;
    tryingToView = false;
    $("#view-help").hide();
  }
});

socket.on('send directory error', sendDirectoryError);
