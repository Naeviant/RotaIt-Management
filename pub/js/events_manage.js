$(document).delegate("#cancel-event", "click", function() {
    $(".sidenav a[data-page='events']").click();
});

$(document).delegate("#save-event", "click", function() {
    var staffNumber = $("#staffnumber select").val(),
        fullName = $("#staffnumber select option:selected").text(),
        type = $("#type select").val(),
        from = new Date(Date.UTC(parseInt($("#from").val().split("-")[0]), parseInt($("#from").val().split("-")[1]) - 1, parseInt($("#from").val().split("-")[2]))),
        to = new Date(Date.UTC(parseInt($("#to").val().split("-")[0]), parseInt($("#to").val().split("-")[1]) - 1, parseInt($("#to").val().split("-")[2])));

    if ($(this).data("edit")) {
        var initial = {
            staffNumber: $("#staffnumber").data("initial"),
            type: $("#type").data("initial"),
            from: $("#from").data("initial"),
            to: $("#to").data("initial")
        }
    }
    else {
        initial = null;
    }

    if (staffNumber && fullName && type && from && !isNaN(from.getTime()) && to && !isNaN(to.getTime()) && from.getTime() <= to.getTime()) {
        $.post("/event/", {
            staffNumber: staffNumber,
            fullName: fullName,
            type: type,
            from: from,
            to: to,
            initial: initial
        }, function(res) {
            if (res.status === 200) {
                $(".sidenav a[data-page='events']").click();
            }
            else {
                
            }
        });
    }
    else {
        M.toast({
            html: "Please fill out all fields with valid values."
        });
    }
});

$("#delete-event").click(function() {
    $.ajax({
        url: "/event/",
        type: "DELETE",
        data: {
            staffNumber: $("#staffnumber select").val(),
            type: $("#type select").val(),
            from: new Date(Date.UTC(parseInt($("#from").val().split("-")[0]), parseInt($("#from").val().split("-")[1]) - 1, parseInt($("#from").val().split("-")[2]))),
            to: new Date(Date.UTC(parseInt($("#to").val().split("-")[0]), parseInt($("#to").val().split("-")[1]) - 1, parseInt($("#to").val().split("-")[2])))
        },
        success: function(res) {
            $(".sidenav a[data-page='events']").click();
        }
    });
});