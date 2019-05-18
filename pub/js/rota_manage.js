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
            $("#rota tbody tr td").removeClass("yellow orange pink lighten-5")
            var keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            $("#rota tbody tr").each(function(i) {
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
        else {
            M.toast({
                html: "An unknown error occurred. The existing rota could not be fully loaded."
            });
        }
    });
}

$(document).ready(function() {
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