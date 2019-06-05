$("#search").off("click");
$(document).off("keypress");

function search() {
    var week = $("#week").val(),
        year = $("#year").val();

    if (week && year) {
        $.get("/partial/rota_manage", {
            week: week,
            year: year
        }, function(res) {
            $("#content").fadeOut("fast", function() {
                $("#content").html(res);
                stopOverflow();
                M.AutoInit();
                $("#content").fadeIn("fast", function() {
                    if ($(".valign-wrapper>.col").height() > $(window).height() - 100) {
                        $(".valign-wrapper").removeClass("valign-wrapper");
                    }
                });
            });
        });
    }
    else {
        M.toast({
            html: "Please enter a week number and year."
        });
    }
}

$("#search").click(function() {
    search();
});

$(document).on("keypress", function(e) {
    if (e.which == 13) {
        $("#search").click();
    }
});