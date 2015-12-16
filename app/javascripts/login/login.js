var ipc = require('electron').ipcRenderer;
var remote = require('remote');

var submitLogin = function() {
  var username = $("input[name='username']").val();
  var password = $("input[name='password']").val();
  if (username === "" && password === "") {

  } else if (username === "") {
    $("#messages").html("Enter a username").show();
  } else if (password === "") {
    $("#messages").html("Enter a password").show();
  } else {
    $("#login").submit()
  }
}

$(function() {
  $("#closelogin").on("click", function() {
    ipc.send('close-login-window');
    event.preventDefault();
  })

  $("#login").submit(function(e)
  {
      var postData = $(this).serializeArray();
      var formURL = $(this).attr("action");
      $.ajax(
      {
          url : formURL,
          type: "POST",
          data : postData,
          dataType: "json",
          success: function(data, textStatus, xhr) {
            if (data.user) {
              ipc.send('loggedin', data.user.username);
              ipc.send('close-login-window');
            } else {
              $("#messages").html("Invalid username or password").show();
            }

          },
          error: function(jqXHR, textStatus, errorThrown) {
              console.log("failed to send the login request");
          }
      });
      e.preventDefault();
  });


  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      submitLogin();
    }
  });

  $("#submitlogin").on("click", submitLogin);
});
