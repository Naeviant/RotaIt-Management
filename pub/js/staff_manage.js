// Unbind Events Later in Script
$(document).off("ready");
$(document).undelegate("#cancel", "click");
$(document).undelegate("#save", "click");
$(document).undelegate("#reset", "click");
$(document).undelegate("#delete", "click");
$(document).off("keypress");

// Restrict Dates of Birth
$(document).ready(function() {
    var d = new Date();
    $("#dob").attr("min", (d.getFullYear() - 100) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2));
    $("#dob").attr("max", (d.getFullYear() - 16) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2));
});

// Handle Cancel Button
$(document).delegate("#cancel", "click", function() {
    // Click Team Button in Sidebar (Trigger Partial Change)
    $(".sidenav a[data-page='staff']").click();
});

// Handle Save Button
$(document).delegate("#save", "click", function() {
    // Get Data from User Inputs & HTML
    var newUser = ($(this).data("new") == "true"), 
        firstName = $("#firstname").val(),
        lastName = $("#lastname").val(),
        dob = new Date($("#dob").val().split("-")[0], $("#dob").val().split("-")[1] - 1, $("#dob").val().split("-")[2]),
        staffNumber = $("#staffnumber").val(),
        jobRole = $("#job").val(),
        email = $("#email").val(),
        hours = $("#hours").val(),
        maxOvertime = $("#overtime").val(),
        pay = $("#pay").val(),
        password = $("#password").val(),
        availability = {
            sun: {
                morning: $("#sunday-mornings").is(":checked"),
                afternoon: $("#sunday-afternoons").is(":checked")
            },
            mon: {
                morning: $("#monday-mornings").is(":checked"),
                afternoon: $("#monday-afternoons").is(":checked"),
                evening: $("#monday-evenings").is(":checked")
            },
            tue: {
                morning: $("#tuesday-mornings").is(":checked"),
                afternoon: $("#tuesday-afternoons").is(":checked"),
                evening: $("#tuesday-evenings").is(":checked")
            },
            wed: {
                morning: $("#wednesday-mornings").is(":checked"),
                afternoon: $("#wednesday-afternoons").is(":checked"),
                evening: $("#wednesday-evenings").is(":checked")
            },
            thu: {
                morning: $("#thursday-mornings").is(":checked"),
                afternoon: $("#thursday-afternoons").is(":checked"),
                evening: $("#thursday-evenings").is(":checked")
            },
            fri: {
                morning: $("#friday-mornings").is(":checked"),
                afternoon: $("#friday-afternoons").is(":checked"),
                evening: $("#friday-evenings").is(":checked")
            },
            sat: {
                morning: $("#saturday-mornings").is(":checked"),
                afternoon: $("#saturday-afternoons").is(":checked"),
                evening: $("#saturday-evenings").is(":checked")
            }
        };

    // Check Parameters are Valid
    if (firstName && lastName && dob && staffNumber && jobRole && email && hours && !isNaN(parseFloat(hours)) && maxOvertime && !isNaN(parseFloat(maxOvertime)) && pay && !isNaN(parseFloat(pay)) && (!newUser || password)) {
        // Send Staff Data to Server
        $.post("/staff/", {
            newUser: newUser,
            firstName: firstName,
            lastName: lastName,
            dob: dob,
            staffNumber: staffNumber,
            jobRole: jobRole,
            email: email,
            hours: parseFloat(hours),
            maxOvertime: parseFloat(maxOvertime),
            pay: parseFloat(pay),
            password: password,
            availability: availability
        }, function(res) {
            // Produce Result Message in Toast
            switch (res.status) {
                case 200:
                    // Click Team Button in Sidebar (Trigger Partial Change)
                    $(".sidenav a[data-page='staff']").click();
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

// Handle Password Reset Button
$("#reset").click(function() {
    // Get Data from User Inputs
    var password = $("#password").val();

    // Check Parameters are Valid
    if (password) {
        // Send Password Reset Request to Server
        $.post("/password/", {
            staffNumber: $(this).data("user"),
            password: password
        }, function(res) {
            // Produce Result Message in Toast
            switch (res.status) {
                case 200:
                    // Close Password Reset Modal
                    $("#modal-password").modal("close");
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
            html: "Please specify a new password."
        });
    }
});

// Handle Delete User Button
$("#delete").click(function() {
    // Send User Deletion Request to Server
    $.ajax({
        url: "/staff/",
        type: "DELETE",
        data: {
            staffNumber: $(this).data("user")
        },
        success: function(res) {
            // Produce Result Message in Toast
            switch (res.status) {
                case 200:
                    // Click Team Button in Sidebar (Trigger Partial Change)
                    $(".sidenav a[data-page='staff']").click();
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
});