$(document).delegate("#cancel", "click", function() {
    $(".sidenav a[data-page='staff']").click();
});

$(document).delegate("#save", "click", function() {
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

    if (firstName && lastName && dob && staffNumber && jobRole && email && hours && !isNaN(parseFloat(hours)) && maxOvertime && !isNaN(parseFloat(maxOvertime)) && pay && !isNaN(parseFloat(pay)) && (!newUser || password)) {
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
            if (res.status === 200) {
                $(".sidenav a[data-page='staff']").click();
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

$("#reset").click(function() {
    var password = $("#password").val();

    if (password) {
        $.post("/password/", {
            staffNumber: $(this).data("user"),
            password: password
        }, function(res) {
            if (res.status === 200) {
                $("#modal-password").modal("close");
                $(".sidenav a[data-page='staff']").click();
            }
            else {
                M.toast({
                    html: "An unknown error occurred. Please try again later."
                });
            }
        });
    }
    else {
        M.toast({
            html: "Please specify a new password."
        });
    }
});

$("#delete").click(function() {
    $.ajax({
        url: "/staff/",
        type: "DELETE",
        data: {
            staffNumber: $(this).data("user")
        },
        success: function(res) {
            $(".sidenav a[data-page='staff']").click();
        }
    });
});