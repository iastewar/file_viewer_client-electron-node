var ipc = require('electron').ipcRenderer;
var remote = require('remote');

$(function() {
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
              $("#messages").html("Username already taken").addClass("alert alert-danger");
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
      $("#signup").submit();
    }
  });

  $("#submitsignup").on("click", function() {
    $("#signup").submit();
    event.preventDefault();
  });
});
