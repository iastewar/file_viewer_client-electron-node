var ipc = require('electron').ipcRenderer;
var remote = require('remote');

var submitSignup = function() {
  var username = $("input[name='username']").val();
  var password = $("input[name='password']").val();
  var usernameRegex = /^[-\w\.\$@\*\!]{3,32}$/;
  var passwordRegex = /^.{3,32}$/;

  if (username === "" && password === "") {

  } else if (username === "") {
    $("#messages").html("Enter a username.").show();
  } else if (password === "") {
    $("#messages").html("Enter a password.").show();
  } else if (!usernameRegex.test(username)) {
    $("#messages").html("Usernames must be 3 to 32 characters long and can only contain letters, numbers, ., -, _, $, @, *,  and !.").show();
  } else if (!passwordRegex.test(password)) {
    $("#messages").html("Passwords mush be 3 to 32 characters long.").show();
  } else {
    $("#signup").submit()
  }
}

$(function() {

  if (process.platform === 'darwin') {
    $("#window").append(
      "<div id='window-minimize-btn' class='window-btn'>\u2500</div>" +
      "<div id='window-maximize-btn' class='window-btn'>\u25a2</div>" +
      "<div id='window-close-btn' class='window-btn'>\u2573</div>"
    );
    $("#window-minimize-btn").on("click", function() {
      ipc.send('minimize-signup-window');
    });
    $("#window-maximize-btn").on("click", function() {
      ipc.send('maximize-signup-window');
    });
    $("#window-close-btn").on("click", function() {
      ipc.send('close-signup-window');
    });
  }

  $("#closesignup").on("click", function() {
    ipc.send('close-signup-window');
    event.preventDefault();
  })

  $("#signup").submit(function(e)
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
              ipc.send('close-signup-window');
            } else {
              $("#messages").html("Username already taken").show();
            }

          },
          error: function(jqXHR, textStatus, errorThrown) {
              console.log("failed to send the signup request");
          }
      });
      e.preventDefault();
  });


  $(document).on("keydown", function() {
    if (event.keyCode === 13) {
      submitSignup();
    }
  });

  $("#submitsignup").on("click", submitSignup);
});
