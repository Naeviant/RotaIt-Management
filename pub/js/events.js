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
    $.get("/partial/events_manage", {
        staffNumber: $(this).closest("tr").find("td:nth-of-type(2)").html(),
        type: $(this).closest("tr").find("td:nth-of-type(3)").html(),
        from: $(this).closest("tr").find("td:nth-of-type(4)").data("timestamp"),
        to: $(this).closest("tr").find("td:nth-of-type(5)").data("timestamp")
    }, function(res) {
        change(res);
    });
});