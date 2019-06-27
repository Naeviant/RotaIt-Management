// Unbind Events Later in Script
$(document).undelegate("#cancel-event", "click");
$(document).undelegate("#save-event", "click");
$(document).undelegate("#delete-event", "click");
$("#staffnumber select, #type select, #from, #to").off("change");
$(document).off("keypress");

// Handle Cancel Button
$(document).delegate("#cancel-event", "click", function() {
    // Click Events Button in Sidebar (Trigger Partial Change)
    $(".sidenav a[data-page='events']").click();
});

// Handle Save Button
$(document).delegate("#save-event", "click", function() {
    // Get Data from HTML
    var staffNumber = $("#staffnumber select").val(),
        fullName = $("#staffnumber select option:selected").text(),
        type = $("#type select").val(),
        from = new Date(Date.UTC(parseInt($("#from").val().split("-")[0]), parseInt($("#from").val().split("-")[1]) - 1, parseInt($("#from").val().split("-")[2]))),
        to = new Date(Date.UTC(parseInt($("#to").val().split("-")[0]), parseInt($("#to").val().split("-")[1]) - 1, parseInt($("#to").val().split("-")[2])));

    // Check if Event is Being Updated
    if ($(this).data("edit")) {
        // Build Object of Old Event
        var initial = {
            staffNumber: $("#staffnumber").data("initial"),
            type: $("#type").data("initial"),
            from: $("#from").data("initial"),
            to: $("#to").data("initial")
        };
    }
    else {
        initial = null;
    }

    // Check Parameters are Valid
    if (staffNumber && fullName && type && from && !isNaN(from.getTime()) && to && !isNaN(to.getTime()) && from.getTime() <= to.getTime()) {
        // Send Event Data to Server
        $.post("/event/", {
            staffNumber: staffNumber,
            fullName: fullName,
            type: type,
            from: from,
            to: to,
            initial: initial
        }, function(res) {
            // Produce Result Message in Toast
            switch (res.status) {
                case 200:
                    M.toast({
                        html: res.message
                    });
                    // Click Events Button in Sidebar (Trigger Partial Change)
                    $(".sidenav a[data-page='events']").click();
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
    }
    else {
        // Produce Error Message in Toast
        M.toast({
            html: "Please fill out all fields with valid values."
        });
    }
});

// Allow User to Press Enter Key Instead of Save Button
$(document).on("keypress", function(e) {
    if (e.which == 13) {
        $("#save-event").click();
    }
});

// Handle Delete Button
$("#delete-event").click(function() {
    // Get Data from HTML
    var staffNumber = $("#staffnumber select").val(),
        type = $("#type select").val(),
        from = new Date(Date.UTC(parseInt($("#from").val().split("-")[0]), parseInt($("#from").val().split("-")[1]) - 1, parseInt($("#from").val().split("-")[2]))),
        to = new Date(Date.UTC(parseInt($("#to").val().split("-")[0]), parseInt($("#to").val().split("-")[1]) - 1, parseInt($("#to").val().split("-")[2])));

    // Check Parameters are Valid
    if (staffNumber && type && from && !isNaN(from.getTime()) && to && !isNaN(to.getTime())) {
        // Send Event Data to Server
        $.ajax({
            url: "/event/",
            type: "DELETE",
            data: {
                staffNumber: staffNumber,
                type: type,
                from: from,
                to: to
            },
            success: function(res) {
                // Produce Result Message in Toast
                switch (res.status) {
                    case 200:
                        M.toast({
                            html: res.message
                        });
                        // Click Events Button in Sidebar (Trigger Partial Change)
                        $(".sidenav a[data-page='events']").click();
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
            }
        });
    }
    else {
        // Produce Error Message in Toast
        M.toast({
            html: "Please fill out all fields with valid values."
        });
    }
});

// Remove Delete Button When Fields Edited
$("#staffnumber select, #type select, #from, #to").change(function() {
    $("#delete-event").fadeOut();
});