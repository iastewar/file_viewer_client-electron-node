var React = require('react');
var ReactDOM = require('react-dom');

var getHighlightClassName = require('./highlight-extensions');
var TreeNode = require('./tree-node');

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
        nodes[i].className = getHighlightClassName(ext);
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
  syncScroll: function() {
    var lines = document.getElementById("fileContentsLines");
  	var text = document.getElementById("fileContentsCode");
  	lines.scrollTop = text.scrollTop;
  },
  componentWillReceiveProps: function(nextProps) {
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
    if (nextProps.fullFileName) {   // change the selected file
      var fileNameArray = nextProps.fullFileName.split("/");
      this.swapView(fileNameArray[fileNameArray.length - 1], findContents(this.props.node, nextProps.fullFileName), nextProps.fullFileName);
    } else {
      this.setState({fileContents: findContents(this.props.node, this.state.fullFileName)});
    }
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
              <pre><div id="fileContentsLines" className="lines">{lineNumbers}</div><code id="fileContentsCode" className={this.state.fileName} onScroll={this.syncScroll}>{this.state.fileContents}</code></pre>
            </div>
          </div>
  }
});

module.exports = FileView;
