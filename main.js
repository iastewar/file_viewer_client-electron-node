'use strict';

var app = require('app');
var BrowserWindow = require('browser-window');

var ipc = require("electron").ipcMain;
require('crash-reporter').start();

var mainWindow = null;
var loginWindow = null;
var signupWindow = null;

// app.on('window-all-closed', function() {
//   // On OS X it is common for applications and their menu bar
//   // to stay active until the user quits explicitly with Cmd + Q
//   if (process.platform != 'darwin') {
//     app.quit();
//   }
// });


app.on('ready', function() {
    mainWindow = new BrowserWindow({
        height: 768,
        width: 1200
    });

    mainWindow.loadURL('file://' + __dirname + '/app/views/index.html');

    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function() {
      mainWindow = null;
      loginWindow = null;
      signupWindow = null;
    });
});

ipc.on('close-main-window', function () {
    app.quit();
});

ipc.on('open-login-window', function () {
    if (loginWindow) {
        return;
    }

    loginWindow = new BrowserWindow({
        height: 400,
        width: 600
    });

    loginWindow.loadURL('file://' + __dirname + '/app/views/login.html');

    loginWindow.on('closed', function () {
        loginWindow = null;
    });
});

ipc.on('close-login-window', function () {
    if (loginWindow) {
        loginWindow.close();
    }
});


ipc.on('loggedin', function(event, username) {
  mainWindow.webContents.send('loggedin', username);
})
