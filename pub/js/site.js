// Initialize All Materialize Elements
$(document).ready(function() {
    M.AutoInit();
});

// Prevent Vertically Aligned Elements from Overflowing
function stopOverflow() {
    if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
        $(".valign-wrapper").removeClass("valign-wrapper");
    }
}

$(document).ready(function() {
    stopOverflow();
});

// Navigation
$(document).delegate(".sidenav a:not(#logout)", "click", function() {
    $.get("/partial/", {
        page: $(this).data("page")
    }, function(res) {
        $(".sidenav").sidenav("close");
        $("#content").fadeOut("fast", function() {
            $("#content").html(res);
            stopOverflow();
            M.AutoInit();
            $("#content").fadeIn("fast");
        });
    });
});

// Log Out
$(document).delegate("#logout", "click", function() {
    $.post("/logout/", function() {
        window.location = "/";
    });
});