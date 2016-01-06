'use strict';

var app = require('app');
var BrowserWindow = require('browser-window');

var ipc = require("electron").ipcMain;
require('crash-reporter').start();

var mainWindow = null;
var loginWindow = null;
var signupWindow = null;
var connectWindow = null;
var viewWindow = null;

// app.on('window-all-closed', function() {
//   // On OS X it is common for applications and their menu bar
//   // to stay active until the user quits explicitly with Cmd + Q
//   if (process.platform != 'darwin') {
//     app.quit();
//   }
// });


app.on('ready', function() {
    mainWindow = new BrowserWindow({
        'title-bar-style': 'hidden',
        height: 768,
        width: 1200
    });

    mainWindow.loadURL('file://' + __dirname + '/app/views/index.html');


    signupWindow = new BrowserWindow({
        //frame: false,
        height: 400,
        width: 600,
        show: false
    });

    signupWindow.loadURL('file://' + __dirname + '/app/views/signup.html');

    loginWindow = new BrowserWindow({
        //frame: false,
        height: 400,
        width: 600,
        show: false
    });

    loginWindow.loadURL('file://' + __dirname + '/app/views/login.html');

    connectWindow = new BrowserWindow({
        //frame: false,
        height: 400,
        width: 600,
        show: false
    });

    connectWindow.loadURL('file://' + __dirname + '/app/views/connect.html');

    viewWindow = new BrowserWindow({
        //frame: false,
        height: 400,
        width: 600,
        show: false
    });

    viewWindow.loadURL('file://' + __dirname + '/app/views/view.html');

    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function() {
      mainWindow = null;
      loginWindow = null;
      signupWindow = null;
      connectWindow = null;
      viewWindow = null;
      app.quit();
    });
});

ipc.on('close-main-window', function () {
    app.quit();
});

ipc.on('open-signup-window', function () {
    signupWindow.show();

    signupWindow.on('closed', function () {
      signupWindow = new BrowserWindow({
          //frame: false,
          height: 400,
          width: 600,
          show: false
      });

      signupWindow.loadURL('file://' + __dirname + '/app/views/signup.html');
    });
});

ipc.on('close-signup-window', function () {
    if (signupWindow) {
        signupWindow.close();
    }
});

ipc.on('open-login-window', function () {
    loginWindow.show();

    loginWindow.on('closed', function () {
      loginWindow = new BrowserWindow({
          //frame: false,
          height: 400,
          width: 600,
          show: false
      });

      loginWindow.loadURL('file://' + __dirname + '/app/views/login.html');
    });
});

ipc.on('close-login-window', function () {
    if (loginWindow) {
        loginWindow.close();
    }
});

ipc.on('open-connect-window', function () {
    connectWindow.show();

    connectWindow.on('closed', function () {
      connectWindow = new BrowserWindow({
          //frame: false,
          height: 400,
          width: 600,
          show: false
      });

      connectWindow.loadURL('file://' + __dirname + '/app/views/connect.html');
    });
});

ipc.on('close-connect-window', function () {
    if (connectWindow) {
        connectWindow.close();
    }
});

ipc.on('open-view-window', function () {
    viewWindow.show();

    viewWindow.on('closed', function () {
      viewWindow = new BrowserWindow({
          //frame: false,
          height: 400,
          width: 600,
          show: false
      });

      viewWindow.loadURL('file://' + __dirname + '/app/views/view.html');
    });
});

ipc.on('close-view-window', function () {
    if (viewWindow) {
        viewWindow.close();
    }
});

ipc.on('connecting', function(event, args) {
  mainWindow.webContents.send('connecting', args);
});

ipc.on('viewing', function(event, args) {
  mainWindow.webContents.send('viewing', args);
});

ipc.on('loggedin', function(event, username) {
  mainWindow.webContents.send('loggedin', username);
});
