$(document).delegate("#action", "click", function() {
    $("#approve, #reject").data("user", $(this).parent().parent().find("td:nth-of-type(2)").html());
    $("#approve, #reject").data("from", $(this).parent().parent().find("td:nth-of-type(3)").data("timestamp"));
    $("#approve, #reject").data("to", $(this).parent().parent().find("td:nth-of-type(4)").data("timestamp"));
    $("#comment").val("");
    M.updateTextFields();
});

$(document).delegate("#approve, #reject", "click", function() {
    $.post("/requests/", {
        staffNumber: $(this).data("user"),
        from: $(this).data("from"),
        to: $(this).data("to"),
        comment: $("#comment").val(),
        action: $(this).data("action")
    }, function(res) {

    });
});