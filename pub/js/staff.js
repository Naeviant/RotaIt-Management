// Unbind Events Later in Script
$(document).undelegate("#add", "click");
$(document).undelegate("#edit", "click");
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

$(document).delegate("#add", "click", function() {
    // Get Partial HTML from Server
    $.get("/partial/staff_manage", function(res) {
        // Change Partial on Page
        change(res);
    });
});

$(document).delegate("#edit", "click", function() {
    // Get Partial HTML from Server
    $.get("/partial/staff_manage?staffNumber=" + $(this).data("user"), function(res) {
        // Change Partial on Page
        change(res);
    });
});