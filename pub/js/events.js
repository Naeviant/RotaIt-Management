function change(content) {
    $("#content").fadeOut("fast", function() {
        $("#content").html(content);
        $('.tooltip').tooltip("destroy");
        M.AutoInit();
        M.updateTextFields();
        $("#content").fadeIn("fast", function() {
            if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
                $(".valign-wrapper").removeClass("valign-wrapper");
            }
        });
    });
}

$(document).delegate("#add-event", "click", function() {
    $.get("/partial/events_manage", function(res) {
        change(res);
    });
});

$(document).delegate("#edit-event", "click", function() {
    $.get("/partial/events_manage?id=", function(res) {
        change(res);
    });
});