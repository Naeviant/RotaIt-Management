// Unbind Events Later in Script
$(document).undelegate("#action", "click");
$(document).undelegate("#approve, reject", "click");
$(document).off("keypress");

// Handle Action Buttons
$(document).delegate("#action", "click", function() {
    // Set Metadata of Approve & Reject Buttons
    $("#approve, #reject").data("user", $(this).data("user"));
    $("#approve, #reject").data("from", $(this).data("from"));
    $("#approve, #reject").data("to", $(this).data("to"));
    // Clear Comments Input
    $("#comment").val("");
    // Update All Text Fields
    M.updateTextFields();
});

$(document).delegate("#approve, #reject", "click", function() {
    // Get Data from HTML
    var user = $(this).data("user"),
        from = $(this).data("from"),
        to = $(this).data("to"),
        action = $(this).data("action");

    // Send Request Data to Server
    $.post("/requests/", {
        staffNumber: user,
        from: from,
        to: to,
        comment: $("#comment").val(),
        action: action
    }, function(res) {
        // Produce Result Message in Toast
        switch (res.status) {
            case 200:
                M.toast({
                    html: "The request has been " + action + "."
                });
                // Remove Processed Entry from Table
                $("[data-user=" + user + "][data-from=" + from + "][data-to=" + to + "]").parent().parent().fadeOut(function() {
                    $("[data-user=" + user + "][data-from=" + from + "][data-to=" + to + "]").parent().parent().remove();
                    // Check if Any Entries are Remaining
                    if ($("#requests tr").length === 0) {
                        // Display No Results Found Message
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