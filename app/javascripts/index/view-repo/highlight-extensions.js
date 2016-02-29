var getHighlightClassName = function(ext) {
  switch (ext) {
    case "rb":
      return "rb";
    case "yml":
      return "yml";
    case "js":
      return "js";
    case "java":
      return "java";
    case "css":
      return "css";
    case "cs":
      return "cs";
    case "cpp":
    case "c":
    case "h":
      return "cpp";
    case "coffee":
      return "coffee";
    case "http":
      return "http";
    case "erb":
      return "erb";
    case "json":
      return "json";
    default:
      return "";
  }
}

module.exports = getHighlightClassName;
