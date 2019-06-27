// Unbind Events Later in Script
$(document).undelegate("#add-event", "click");
$(document).undelegate("#edit-event", "click");
$(document).off("keypress");

// Handle Partial Transitions
function change(content) {
    // Fade Out Page Content
    $("#content").fadeOut("fast", function() {
        // Change Page Content HTML
        $("#content").html(content);
        // Destroy All Tooltips on Page
        $('.material-tooltip').remove();
        // Initialise Materialize Elements
        M.AutoInit();
        // Update All Text Fields
        M.updateTextFields();
        // Fade in Page Content
        $("#content").fadeIn("fast", function() {
            // Prevent Page Overflow
            stopOverflow();
        });
    });
}

$(document).delegate("#add-event", "click", function() {
    // Get Partial HTML from Server
    $.get("/partial/events_manage", function(res) {
        // Change Partial on Page
        change(res);
    });
});

$(document).delegate("#edit-event", "click", function() {
    // Get Partial HTML from Server
    $.get("/partial/events_manage", {
        staffNumber: $(this).closest("tr").find("td:nth-of-type(2)").html(),
        type: $(this).closest("tr").find("td:nth-of-type(3)").html(),
        from: $(this).closest("tr").find("td:nth-of-type(4)").data("timestamp"),
        to: $(this).closest("tr").find("td:nth-of-type(5)").data("timestamp")
    }, function(res) {
        // Change Partial on Page
        change(res);
    });
});