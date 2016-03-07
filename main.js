'use strict';

var app = require('app');
var BrowserWindow = require('browser-window');

var ipc = require("electron").ipcMain;
// require('crash-reporter').start();

var mainWindow = null;
var loginWindow = null;
var signupWindow = null;

var titleBarStyle = 'default';
var frame = false;

if (process.platform === 'darwin') {
  titleBarStyle = 'hidden';
  frame = true;
}

var loadMainWindow = function() {
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

  mainWindow.on('closed', function() {
    mainWindow = null;
    if (process.platform !== 'darwin') {
      if (loginWindow) loginWindow.close();
      if (signupWindow) signupWindow.close();
      app.quit();
    }
  });

  if (process.platform !== 'darwin') {
    mainWindow.on('maximize', function() {
      mainWindow.webContents.send('maximized');
    });

    mainWindow.on('unmaximize', function() {
      mainWindow.webContents.send('unmaximized');
    });
  }

  // mainWindow.webContents.openDevTools();
}

var loadSignupWindow = function() {
  signupWindow = new BrowserWindow({
      titleBarStyle: titleBarStyle,
      frame: frame,
      height: 400,
      width: 500,
      show: false
  });

  signupWindow.loadURL('file://' + __dirname + '/app/views/signup.html');

  signupWindow.on('closed', function () {
    if (mainWindow) {
      loadSignupWindow();
    } else {
      signupWindow = null;
    }
  });

  if (process.platform !== 'darwin') {
    signupWindow.on('maximize', function() {
      signupWindow.webContents.send('maximized');
    });

    signupWindow.on('unmaximize', function() {
      signupWindow.webContents.send('unmaximized');
    });
  }
}

var loadLoginWindow = function() {
  loginWindow = new BrowserWindow({
      titleBarStyle: titleBarStyle,
      frame: frame,
      height: 400,
      width: 500,
      show: false
  });

  loginWindow.loadURL('file://' + __dirname + '/app/views/login.html');

  loginWindow.on('closed', function() {
    if (mainWindow) {
      loadLoginWindow();
    } else {
      loginWindow = null;
    }
  });

  if (process.platform !== 'darwin') {
    loginWindow.on('maximize', function() {
      loginWindow.webContents.send('maximized');
    });

    loginWindow.on('unmaximize', function() {
      loginWindow.webContents.send('unmaximized');
    });
  }
}

app.on('ready', function() {
    loadMainWindow();
    loadSignupWindow();
    loadLoginWindow();
});

app.on('activate', function() {
  if (!mainWindow) {
    loadMainWindow();
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
