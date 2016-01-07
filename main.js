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

var titleBarStyle = 'default';
var frame = false;

if (process.platform === 'darwin') {
  titleBarStyle = 'hidden';
  frame = true;
}

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 768,
        width: 1200,
        show: false
    });

    mainWindow.loadURL('file://' + __dirname + '/app/views/index.html');

    mainWindow.webContents.on('did-finish-load', function() {
      mainWindow.show();
    });

    signupWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 300,
        width: 600,
        show: false
    });

    signupWindow.loadURL('file://' + __dirname + '/app/views/signup.html');

    loginWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 300,
        width: 600,
        show: false
    });

    loginWindow.loadURL('file://' + __dirname + '/app/views/login.html');

    connectWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 300,
        width: 600,
        show: false
    });

    connectWindow.loadURL('file://' + __dirname + '/app/views/connect.html');

    viewWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 300,
        width: 600,
        show: false
    });

    viewWindow.loadURL('file://' + __dirname + '/app/views/view.html');

    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function() {
      mainWindow = null;
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
});

app.on('activate', function() {
  if (!mainWindow) {
    mainWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 768,
        width: 1200,
        show: false
    });

    mainWindow.loadURL('file://' + __dirname + '/app/views/index.html');

    mainWindow.webContents.on('did-finish-load', function() {
      mainWindow.show();
    });
  }
});

ipc.on('minimize-main-window', function () {
    mainWindow.minimize();
});

ipc.on('maximize-main-window', function () {
    mainWindow.maximize();
});

ipc.on('close-main-window', function () {
    mainWindow.close();
});

ipc.on('open-signup-window', function () {
    signupWindow.show();

    signupWindow.on('closed', function () {
      signupWindow = new BrowserWindow({
          titleBarStyle: titleBarStyle,
          frame: frame,
          height: 300,
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
          titleBarStyle: titleBarStyle,
          frame: frame,
          height: 300,
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
          titleBarStyle: titleBarStyle,
          frame: frame,
          height: 300,
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
          titleBarStyle: titleBarStyle,
          frame: frame,
          height: 300,
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
