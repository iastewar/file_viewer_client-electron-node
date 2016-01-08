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
        height: 320,
        width: 500,
        show: false
    });

    signupWindow.loadURL('file://' + __dirname + '/app/views/signup.html');

    loginWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 320,
        width: 500,
        show: false
    });

    loginWindow.loadURL('file://' + __dirname + '/app/views/login.html');

    connectWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 320,
        width: 500,
        show: false
    });

    connectWindow.loadURL('file://' + __dirname + '/app/views/connect.html');

    viewWindow = new BrowserWindow({
        titleBarStyle: titleBarStyle,
        frame: frame,
        height: 320,
        width: 500,
        show: false
    });

    viewWindow.loadURL('file://' + __dirname + '/app/views/view.html');

    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function() {
      mainWindow = null;
      if (process.platform !== 'darwin') {
        if (loginWindow) loginWindow.close();
        if (signupWindow) signupWindow.close();
        if (connectWindow) connectWindow.close();
        if (viewWindow) viewWindow.close();
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
            height: 320,
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
            height: 320,
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

ipc.on('open-connect-window', function () {
    connectWindow.show();

    connectWindow.on('closed', function () {
      if (mainWindow) {
        connectWindow = new BrowserWindow({
            titleBarStyle: titleBarStyle,
            frame: frame,
            height: 320,
            width: 500,
            show: false
        });

        connectWindow.loadURL('file://' + __dirname + '/app/views/connect.html');
      } else {
        connectWindow = null;
      }
    });
});

ipc.on('minimize-connect-window', function () {
    connectWindow.minimize();
});

ipc.on('maximize-connect-window', function () {
    connectWindow.maximize();
});

ipc.on('restore-connect-window', function () {
    connectWindow.unmaximize();
});

ipc.on('close-connect-window', function () {
    if (connectWindow) {
        connectWindow.close();
    }
});

ipc.on('open-view-window', function () {
    viewWindow.show();

    viewWindow.on('closed', function () {
      if (mainWindow) {
        viewWindow = new BrowserWindow({
            titleBarStyle: titleBarStyle,
            frame: frame,
            height: 320,
            width: 500,
            show: false
        });

        viewWindow.loadURL('file://' + __dirname + '/app/views/view.html');
      } else {
        viewWindow = null;
      }
    });
});

ipc.on('minimize-view-window', function () {
    viewWindow.minimize();
});

ipc.on('maximize-view-window', function () {
    viewWindow.maximize();
});

ipc.on('restore-view-window', function () {
    viewWindow.unmaximize();
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
