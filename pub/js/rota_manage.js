function build(state) {
    var week = $("#header").data("week"),
        year = $("#header").data("year"),
        shifts = [],
        shift = {};

    $("#rota tbody tr").each(function(i) {
        var fullName = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[0],
            staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1],
            n = 0;

        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td").each(function(j) {
            if (j === 0) {
                return true;
            }
            if (j % 3 === 1) {
                shift.start = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[1])));
            }
            else if (j % 3 === 2) {
                shift.end = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[1])));
            }
            else if (j % 3 === 0) {
                shift.breaks = parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val());
                n++;
            }
            if (shift.start && shift.end && (shift.breaks >= 0)) {
                shift.staffNumber = staffNumber;
                if (state != "verify") {
                    shift.fullName = fullName;
                }
                if (state == "provisional") {
                    shift.provisional = true;
                }
                else if (state == "publish") {
                    shift.provisional = false;
                }
                shifts.push(shift);
                shift = {};
            }
        });
    });
    return shifts;
}

function colour() {
    $.get("/week/", {
        week: $("#header").data("week"),
        year: $("#header").data("year")
    }, function(res) {
        if (res.status === 200) {
            $.get("/events/", {
                week: $("#header").data("week"),
                year: $("#header").data("year")
            }, function(resp) {
                if (resp.status === 200) {
                    $("#rota tbody tr td").removeClass("yellow orange pink lighten-5")
                    var keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                    $("#rota tbody tr").each(function(i) {
                        var staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1];

                        for (var event of resp.events) {
                            for (var j = 1; j <= 7; j++) {
                                var boundary = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]))).getTime();
                                if (boundary >= event.from && boundary <= event.to && event.staffNumber == staffNumber) {
                                    if (event.type != "interviewing" && event.type != "course") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ") input").attr("disabled", true);
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ") input").attr("disabled", true);
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ") input").attr("disabled", true);
                                    }
                                    else {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("green lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("green lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("green lighten-5");
                                    }
                                    if (event.type == "sickness" || event.type == "maternity" || event.type == "paternity") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("hashed purple");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("hashed purple");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("hashed purple");
                                    }
                                    if (event.type == "leave") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("hashed blue");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("hashed blue");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("hashed blue");
                                    }
                                    if (event.type == "suspension") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("hashed red");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("hashed red");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("hashed red");
                                    }
                                    if (event.type == "elsewhere") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("hashed black");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("hashed black");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("hashed black");
                                    }
                                }
                            }
                        }
                        var n = 0;
                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td").each(function(j) {
                            if (j === 0) {
                                return true;
                            }
                            var today = keys[new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getDay()];
                            if (today == "sun") {
                                if (j % 3 === 0) {
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j - 1) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().trim()) {
                                        if (!$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").hasClass("lighten-5")) {
                                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j - 1) + ")").addClass("orange lighten-5");
                                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("orange lighten-5");
                                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("orange lighten-5");
                                        }
                                    }
                                    n++;
                                }
                                return true;
                            }
                            if (j % 3 === 1) {
                                var start = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[1]))).getTime(),
                                    open = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getTime() + new Date(res.week[today]["openCustomers"]).getTime();
                                if (start <= open) {
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 3) + ") input").val().trim()) {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("yellow lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ")").addClass("yellow lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 3) + ")").addClass("yellow lighten-5");
                                    }
                                }
                            }
                            else if (j % 3 === 2) {
                                var end = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[1]))).getTime(),
                                    closed = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getTime() + new Date(res.week[today]["closedCustomers"]).getTime();
                                if (end >= closed) {
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ") input").val().trim()) {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("pink lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("pink lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ")").addClass("pink lighten-5");
                                    }
                                }
                            }
                            else if (j % 3 === 0) {
                                if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j - 1) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().trim()) {
                                    if (!$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").hasClass("lighten-5")) {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j - 1) + ")").addClass("orange lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("orange lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("orange lighten-5");
                                    }
                                }
                                n++;
                            }
                        });
                    });
                }
            });

        }
        else {
            M.toast({
                html: "An unknown error occurred. The existing rota could not be fully loaded."
            });
        }
    });
}

$(document).ready(function() {
    $("#rota thead tr:nth-of-type(2) td").each(function(i) {
        var d = new Date(1547942400000 + (parseInt($("#header").data("week")) * 604800000) + (i * 86400000));
        $(this).html(("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear());
    });
    $.get("/rota/", {
        week: $("#header").data("week"),
        year: $("#header").data("year")
    }, function(res) {
        if (res.status === 200) {
            $("#rota tbody tr").each(function(i) {
                var staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1],
                    shifts = res.rota.filter(function(x) { return x.staffNumber == staffNumber });

                for (var j = 1; j <= 7; j++) {
                    var lower = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]))).getTime();
                    var higher = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]), 23, 59, 59)).getTime();
                    for (var shift of shifts) {
                        if (shift.start > lower && shift.end < higher) {
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((3 * j) - 1) + ") input").val(("0" + new Date(shift.start).getUTCHours()).slice(-2) + ":" + ("0" + new Date(shift.start).getUTCMinutes()).slice(-2));
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((3 * j)) + ") input").val(("0" + new Date(shift.end).getUTCHours()).slice(-2) + ":" + ("0" + new Date(shift.end).getUTCMinutes()).slice(-2));
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((3 * j) + 1) + ") input").val(shift.breaks);
                        }
                    }
                }
            });
            colour();
        }
        else {
            M.toast({
                html: "An unknown error occurred. The existing rota could not be fully loaded."
            });
        }
    });
});

$(document).delegate("#rota input", "change", function() {
    colour();
});

$("#save").click(function() {
    $.post("/rota/save/", {
        weekNumber: $("#header").data("week"),
        year: $("#header").data("year"),
        publish: false,
        shifts: build("provisional")
    }, function(res) {
        if (res.status === 200) {
            M.toast({
                html: "The rota has been saved."
            });
        }
        else {
            M.toast({
                html: "An unknown error occurred."
            });
        }
    });
});

$("#publish").click(function() {
    $.post("/rota/save/", {
        weekNumber: $("#header").data("week"),
        year: $("#header").data("year"),
        publish: true,
        shifts: build("publish")
    }, function(res) {
        if (res.status === 200) {
            $("#save").remove();
            M.toast({
                html: "The rota has been saved and published."
            });
        }
        else {
            M.toast({
                html: "An unknown error occurred."
            });
        }
    });
});

$("#save-week").click(function() {
    var week = {
        sun: {
            closed: $("#week-sun-closed").is(":checked"),
            bankHoliday: $("#week-sun-bankhol").is(":checked"),
            openCustomers: $("#week-sun-open-customers").val(),
            closedCustomers: $("#week-sun-closed-customers").val(),
            openStaff: $("#week-sun-open-staff").val(),
            closedStaff: $("#week-sun-closed-staff").val()
        },
        mon: {
            closed: $("#week-mon-closed").is(":checked"),
            bankHoliday: $("#week-mon-bankhol").is(":checked"),
            openCustomers: $("#week-mon-open-customers").val(),
            closedCustomers: $("#week-mon-closed-customers").val(),
            openStaff: $("#week-mon-open-staff").val(),
            closedStaff: $("#week-mon-closed-staff").val()
        },
        tue: {
            closed: $("#week-tue-closed").is(":checked"),
            bankHoliday: $("#week-tue-bankhol").is(":checked"),
            openCustomers: $("#week-tue-open-customers").val(),
            closedCustomers: $("#week-tue-closed-customers").val(),
            openStaff: $("#week-tue-open-staff").val(),
            closedStaff: $("#week-tue-closed-staff").val()
        },
        wed: {
            closed: $("#week-wed-closed").is(":checked"),
            bankHoliday: $("#week-wed-bankhol").is(":checked"),
            openCustomers: $("#week-wed-open-customers").val(),
            closedCustomers: $("#week-wed-closed-customers").val(),
            openStaff: $("#week-wed-open-staff").val(),
            closedStaff: $("#week-wed-closed-staff").val()
        },
        thu: {
            closed: $("#week-thu-closed").is(":checked"),
            bankHoliday: $("#week-thu-bankhol").is(":checked"),
            openCustomers: $("#week-thu-open-customers").val(),
            closedCustomers: $("#week-thu-closed-customers").val(),
            openStaff: $("#week-thu-open-staff").val(),
            closedStaff: $("#week-thu-closed-staff").val()
        },
        fri: {
            closed: $("#week-fri-closed").is(":checked"),
            bankHoliday: $("#week-fri-bankhol").is(":checked"),
            openCustomers: $("#week-fri-open-customers").val(),
            closedCustomers: $("#week-fri-closed-customers").val(),
            openStaff: $("#week-fri-open-staff").val(),
            closedStaff: $("#week-fri-closed-staff").val()
        },
        sat: {
            closed: $("#week-sat-closed").is(":checked"),
            bankHoliday: $("#week-sat-bankhol").is(":checked"),
            openCustomers: $("#week-sat-open-customers").val(),
            closedCustomers: $("#week-sat-closed-customers").val(),
            openStaff: $("#week-sat-open-staff").val(),
            closedStaff: $("#week-sat-closed-staff").val()
        }
    }

    var invalid = false;
    for (var day of Object.keys(week)) {
        if (!week[day].openCustomers || !week[day].closedCustomers || !week[day].openStaff || !week[day].closedStaff) {
            invalid = true;
        }
    }
    if (invalid === false) {
        week.weekNumber = $("#header").data("week");
        week.year = $("#header").data("year");
        $.post("/week/", week, function(res) {
            if (res.status === 200) {
                $("#modal-settings").modal("close");
                M.toast({
                    html: "The week settings have been saved."
                });
            }
        });
    }
    else {
        M.toast({
            html: "Please fill out all fields with valid values."
        });
    }
});