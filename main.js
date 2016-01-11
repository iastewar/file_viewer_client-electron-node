'use strict';

var app = require('app');
var BrowserWindow = require('browser-window');

var ipc = require("electron").ipcMain;
require('crash-reporter').start();

var mainWindow = null;
var loginWindow = null;
var signupWindow = null;

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
        height: 400,
        width: 500,
        show: false
    });

    signupWindow.loadURL('file://' + __dirname + '/app/views/signup.html');

    loginWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 400,
        width: 500,
        show: false
    });

    loginWindow.loadURL('file://' + __dirname + '/app/views/login.html');

    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function() {
      mainWindow = null;
      if (process.platform !== 'darwin') {
        if (loginWindow) loginWindow.close();
        if (signupWindow) signupWindow.close();
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

ipc.on('restore-main-window', function() {
    mainWindow.unmaximize();
})

ipc.on('close-main-window', function () {
    mainWindow.close();
});

ipc.on('open-signup-window', function () {
    signupWindow.show();

    signupWindow.on('closed', function () {
      if (mainWindow) {
        signupWindow = new BrowserWindow({
            titleBarStyle: titleBarStyle,
            frame: frame,
            height: 400,
            width: 500,
            show: false
        });

        signupWindow.loadURL('file://' + __dirname + '/app/views/signup.html');
      } else {
        signupWindow = null;
      }
    });
});

ipc.on('minimize-signup-window', function () {
    signupWindow.minimize();
});

ipc.on('maximize-signup-window', function () {
    signupWindow.maximize();
});

ipc.on('restore-signup-window', function () {
    signupWindow.unmaximize();
});

ipc.on('close-signup-window', function () {
    if (signupWindow) {
        signupWindow.close();
    }
});

ipc.on('open-login-window', function () {
    loginWindow.show();

    loginWindow.on('closed', function () {
      if (mainWindow) {
        loginWindow = new BrowserWindow({
            titleBarStyle: titleBarStyle,
            frame: frame,
            height: 400,
            width: 500,
            show: false
        });

        loginWindow.loadURL('file://' + __dirname + '/app/views/login.html');
      } else {
        loginWindow = null;
      }
    });
});

ipc.on('minimize-login-window', function () {
    loginWindow.minimize();
});

ipc.on('maximize-login-window', function () {
    loginWindow.maximize();
});

ipc.on('restore-login-window', function () {
    loginWindow.unmaximize();
});

ipc.on('close-login-window', function () {
    if (loginWindow) {
        loginWindow.close();
    }
});

ipc.on('loggedin', function(event, username) {
  mainWindow.webContents.send('loggedin', username);
});
