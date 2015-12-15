var socket = require('../socket');
var React = require('react');
var ReactDOM = require('react-dom');
var ipc = require('electron').ipcRenderer;

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
      this.props.notifyParent(this.props.node.name, this.props.node.fileContents);
    }
  },
  render: function() {
    var childNodes;
    var t = this;
    if (this.props.node.childNodes) {
      childNodes = this.props.node.childNodes.map(function(node, index) {
        return <div key={index}><TreeNode node={node} notifyParent={t.props.notifyParent}/></div>
      });
    }

    var style = {marginLeft: "25px"};
    if (!this.state.visible) {
      style = {marginLeft: "25px", display: "none"};
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

    var node;
    if (this.props.node.childNodes) {
      node = <div onClick={this.toggle} className={caretClass} style={{cursor: "pointer"}}> <div className={folderClass}> {this.props.node.name}</div></div>;
    } else {
      node = <div onClick={this.toggle} style={{cursor: "pointer"}} className="fa fa-file-text-o"> {this.props.node.name}</div>;
    }

    return (
      <div>
        {node}
        <div style={style}>
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
    if (nodes.length > 0) {
      for (var i = 0; i < nodes.length; i++) {
        hljs.highlightBlock(nodes[i]);
      }
    }
  },
  getInitialState: function() {
    return {fileName: "No file selected", fileContents: ""}
  },
  swapView: function(fileName, fileContents) {
    this.setState({fileName: fileName});
    this.setState({fileContents: fileContents});
  },
  componentWillReceiveProps: function() {
    var findContents = function(node, fileName) {
      if (node.name === fileName) {
        return node.fileContents;
      }
      if (!node.childNodes) {
        return;
      }
      var childrenLength = node.childNodes.length;
      for (var i = 0; i < childrenLength; i++) {
        var fileContents = findContents(node.childNodes[i], fileName);
        if (fileContents) {
          return fileContents;
        }
      }
    }

    this.swapView(this.state.fileName, findContents(this.props.node,this.state.fileName));
  },
  render: function() {
    return <div className="row">
            <div id="fileTree" className="col-md-3 col-md-offset-1"><TreeNode node={this.props.node} notifyParent={this.swapView}/></div>
            <div id="fileContents" className="col-md-7">
              <div className="panel panel-default">
                <div className="panel-heading">
                  <h3 className="panel-title">{this.state.fileName}</h3>
                </div>
                <div className="panel-body">
                  <pre><code>{this.state.fileContents}</code></pre>
                </div>
              </div>
            </div>
          </div>
  }
});

var fileTree = {};

var addToFileTree = function(fileTree, fileNameArray, length, index, fileContents) {
  fileTree.name = fileNameArray[index];
  if (index === length - 1) {
    fileTree.fileContents = fileContents;
    return;
  }
  if (!fileTree.childNodes) {
    fileTree.childNodes = [{name: fileNameArray[index + 1]}];
    addToFileTree(fileTree.childNodes[0], fileNameArray, length, index + 1, fileContents);
  } else {
    var flag = false;
    var childrenLength = fileTree.childNodes.length;
    for (var i = 0; i < childrenLength; i++) {
      if (fileNameArray[index + 1] === fileTree.childNodes[i].name) {
        addToFileTree(fileTree.childNodes[i], fileNameArray, length, index + 1, fileContents);
        flag = true;
      }
    }
    if (!flag) {
      fileTree.childNodes.push({name: fileNameArray[index + 1]});
      addToFileTree(fileTree.childNodes[fileTree.childNodes.length - 1], fileNameArray, length, index + 1, fileContents);
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

ab2str = function(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

var sendDirectoryError = function(msg) {
  $("#view-messages").html("Problem retrieving directory " + msg + ". Either repository does not exist, or the server is experiencing problems");
  $("#view-messages").fadeIn(1000, function() {
    setTimeout(function(){
      $("#view-messages").fadeOut(1000);
    }, 3000);
  });
}

$(function(){
  $("#view-btn").on("click", function() {
    ipc.send('open-view-window');
  });
});


socket.on('send file', function(msg){
  var fileNameArray = msg.fileName.split("/");
  if (msg.owner + "/" + fileNameArray[0] !== serverFolder) {
    return;
  }
  if (msg.deleted) {
    removeFromFileTree(fileTree, fileNameArray, fileNameArray.length, 0);
  } else {
    addToFileTree(fileTree, fileNameArray, fileNameArray.length, 0, ab2str(msg.fileContents));
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
    $("#view-header").html(arr[1]);
    serverFolder = msg;
    tryingToView = false;
  }
});

socket.on('send directory error', sendDirectoryError);
