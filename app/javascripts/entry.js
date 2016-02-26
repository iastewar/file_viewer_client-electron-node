var version = 0.04;

// max file size allowed to be uploaded in bytes
var maxFileSize = 20971520;

require('./index/index')(maxFileSize, version);
