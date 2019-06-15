$(document).undelegate("#action", "click");
$(document).undelegate("#approve, reject", "click");
$(document).off("keypress");

$(document).delegate("#action", "click", function() {
    $("#approve, #reject").data("user", $(this).data("user"));
    $("#approve, #reject").data("from", $(this).data("from"));
    $("#approve, #reject").data("to", $(this).data("to"));
    $("#comment").val("");
    M.updateTextFields();
});

$(document).delegate("#approve, #reject", "click", function() {
    var user = $(this).data("user"),
        from = $(this).data("from"),
        to = $(this).data("to"),
        action = $(this).data("action");

    $.post("/requests/", {
        staffNumber: user,
        from: from,
        to: to,
        comment: $("#comment").val(),
        action: action
    }, function(res) {
        switch (res.status) {
            case 200:
                M.toast({
                    html: "The request has been " + action + "."
                });
                $("[data-user=" + user + "][data-from=" + from + "][data-to=" + to + "]").parent().parent().fadeOut(function() {
                    $("[data-user=" + user + "][data-from=" + from + "][data-to=" + to + "]").parent().parent().remove();
                    if ($("#requests tr").length === 0) {
                        $("#requests").append("<tr id=\"none\" style=\"display: none;\"><td colspan=\"6\" class=\"center\"><em>No results found.</em></td></tr>");
                        $("#none").fadeIn();
                    }
                });
                break;
            case 400:
                M.toast({
                    html: "An unknown error occured. Please try again later."
                });
                break;
            case 401:
                M.toast({
                    html: "You are not authorised to use this system."
                });
                break;
            case 403:
                M.toast({
                    html: "Your session has expired. Please log in again to continue."
                });
                break;
            case 500:
                M.toast({
                    html: "The system could not contact the server. Please try again later."
                });
                break;
        }
    });
});