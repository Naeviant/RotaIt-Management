$(document).undelegate("#add", "click");
$(document).undelegate("#edit", "click");
$(document).off("keypress");

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

$(document).delegate("#add", "click", function() {
    $.get("/partial/staff_manage", function(res) {
        change(res);
    });
});

$(document).delegate("#edit", "click", function() {
    $.get("/partial/staff_manage?staffNumber=" + $(this).data("user"), function(res) {
        change(res);
    });
});