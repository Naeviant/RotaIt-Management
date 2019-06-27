// Unbind Events Later in Script
$(document).off("ready");
$("#change").off("click");
$("#previous").off("click");
$("#next").off("click");
$("#verify").off("click");
$("#save").off("click");
$("#publish").off("click");
$("#save-week").off("click");
$(document).undelegate("#rota input", "change");
$(document).off("keypress");

// Build Array of Shift Data
function build(state) {
    // Get Data from HTML and Prepare to Hold Shifts
    var week = $("#header").data("week"),
        year = $("#header").data("year"),
        shifts = [],
        shift = {};

    // Loop Through Each Row of Table
    $("#rota tbody tr").each(function(i) {
        // Get Data from HTML for Iteration
        var fullName = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[0],
            staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1],
            n = 0;

        // Loop Through Each Column of Row
        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td").each(function(j) {
            // Ignore First (Name and Staff Number)
            if (j === 0) {
                return true;
            }
            // Work Out Contents of Cell
            if (j % 3 === 1) {
                // Get Start of Shift
                shift.start = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[1])));
            }
            else if (j % 3 === 2) {
                // Get End of Shift
                shift.end = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[1])));
            }
            else if (j % 3 === 0) {
                // Ger Length of Breaks of Shift
                shift.breaks = parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val());
                n++;
            }
            // Check if All Three Items Found
            if (shift.start && shift.end && (shift.breaks >= 0)) {
                // Check if Shift is a Night Shift
                if (shift.end.getTime() < shift.start.getTime()) {
                    shift.end.setUTCDate(shift.end.getUTCDate() + 1);
                }
                // Add Staff Number to Shift Object
                shift.staffNumber = staffNumber;
                // Include Staff Members' Names if Rota is Being Saved/Published
                if (state != "verify") {
                    shift.fullName = fullName;
                }
                // Determine if the Shift is Provisional
                if (state == "provisional") {
                    shift.provisional = true;
                }
                else if (state == "publish") {
                    shift.provisional = false;
                }
                // Add Shift to Shifts Array
                shifts.push(shift);
                // Reset Shift Object
                shift = {};
            }
        });
    });
    // Return Shifts Array Back to Original Function
    return shifts;
}

// Define Variables to Hold Week and Event Data
var week = {},
    events = {};

// Get Week and Event Data from Server
function makeRequest() {
    // Get Week Data from Server
    $.get("/week/", {
        week: $("#header").data("week"),
        year: $("#header").data("year")
    }, function(res) {
        // Get Event Data from Server
        $.get("/events/", {
            week: $("#header").data("week"),
            year: $("#header").data("year")
        }, function(resp) {
            // Set Week and Event Data Variables
            week = res;
            events = resp;
            colour(week, events);
        });
    });
}

// Colour Rota Cells and Enable/Disable Inputs
function colour(res, resp) {
    // Check Requests were Successful
    if (res.status === 200 && resp.status === 200) {
        // Define Keys of Week Object in Array
        var keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        // Remove All Existing Colours
        $("#rota tbody tr td").removeClass("yellow orange pink green purple blue red grey black hashed lighten-5");
        // Loop Through Each Day
        for (var j = 0; j < 7; j++) {
            // Remove Existing Header Labels
            $("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html($("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html().replace("(BH)", ""));
            $("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html($("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html().replace("(C)", ""));
            // Check if Day is a Bank Holiday
            if (res.week[keys[j]].bankHoliday === true) {
                // Add (BH) Label to Header
                $("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html($("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html() + " (BH)");
            }
            // Check if Store is Closed on Day
            if (res.week[keys[j]].closed === true) {
                // Add (C) Label to Header
                $("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html($("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html() + " (C)");
                // Disable All Inputs for Day
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 2) + ") input").attr("disabled", true);
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 3) + ") input").attr("disabled", true);
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 4) + ") input").attr("disabled", true);
                // Clear Inputs for Day
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 2) + ") input").val("");
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 3) + ") input").val("");
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 4) + ") input").val("");
                // Colour Cells Hashed Black for Day
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 2) + ")").addClass("hashed black");
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 3) + ")").addClass("hashed black");
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 4) + ")").addClass("hashed black");
            }
            else {
                // Enable All Inputs for Day
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 2) + ") input").attr("disabled", false);
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 3) + ") input").attr("disabled", false);
                $("#rota tbody td:nth-of-type(" + ((3 * j) + 4) + ") input").attr("disabled", false);
            }
        }
        // Loop Through Each Row of Table
        $("#rota tbody tr").each(function(i) {
            // Get Staff Number from Current Row
            var staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1];

            // Loop Through Each Day
            for (var event of resp.events) {
                // Loop Through Days
                for (var j = 1; j <= 7; j++) {
                    // Define Timestamp for Current Day
                    var boundary = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]))).getTime();
                    // Check if Day is Within Event Dates
                    if (boundary >= event.from && boundary <= event.to && event.staffNumber == staffNumber) {
                        // Check if Event is Administrative or Approved Annual Leave
                        if (event.type != "interviewing" && event.type != "course" && (event.type != "leave" || event.status == "approved" || event.status == "fixed")) {
                            // Disable Inputs for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ") input").attr("disabled", true);
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ") input").attr("disabled", true);
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ") input").attr("disabled", true);
                        }
                        else if (event.type == "interviewing" || event.type == "course") {
                            // Colour Cells Green for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("green lighten-5");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("green lighten-5");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("green lighten-5");
                        }
                        // Check if Event is Sickess or Maternity/Paternity Leave
                        if (event.type == "sickness" || event.type == "maternity" || event.type == "paternity") {
                            // Colour Cells Hashed Purple for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("hashed purple");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("hashed purple");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("hashed purple");
                        }
                        // Check if Event is Approved Annual Leave
                        if (event.type == "leave" && (event.status == "approved" || event.status == "fixed")) {
                            // Colour Cells Hashed Blue for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("hashed blue");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("hashed blue");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("hashed blue");
                        }
                        // Check if Event is a Suspension
                        if (event.type == "suspension") {
                            // Colour Cells Hashed Red for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("hashed red");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("hashed red");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("hashed red");
                        }
                        // Check if Event is Working Elsewhere
                        if (event.type == "elsewhere") {
                            // Colour Cells Hashed Grey for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 - 1) + ")").addClass("hashed grey");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3) + ")").addClass("hashed grey");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 3 + 1) + ")").addClass("hashed grey");
                        }
                    }
                }
            }
            var n = 0;
            // Loop Through Each Column of Row
            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td").each(function(j) {
                // Ignore First (Name and Staff Number)
                if (j === 0) {
                    return true;
                }
                // Work Out Current Day as String
                var today = keys[new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getDay()];
                // Handle Sundays
                if (today == "sun") {
                    // Focus on 3rd (Breaks) Cell
                    if (j % 3 === 0) {
                        // Check for Valid Values in All Inputs
                        if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j - 1) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().trim()) {
                            // Check if Cells are Already Coloured
                            if (!$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").hasClass("lighten-5")) {
                                // Colour Cells Orange for Staff Member for Day
                                $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j - 1) + ")").addClass("orange lighten-5");
                                $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("orange lighten-5");
                                $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("orange lighten-5");
                            }
                        }
                        // Proceed to Next Day
                        n++;
                    }
                    // Proceed to Next Iteration
                    return true;
                }
                // Work Out Contents of Cell
                if (j % 3 === 1) {
                    // Get Shift Start and Store Opening Time6 for Day
                    var start = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[1]))).getTime(),
                        open = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getTime() + new Date(res.week[today]["openCustomers"]).getTime();
                    // Check if the Shift Starts at or Before Store Opening
                    if (start <= open) {
                        // Check for Valid Values in All Inputs
                        if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 3) + ") input").val().trim()) {
                            // Colour Cells Yellow for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("yellow lighten-5");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ")").addClass("yellow lighten-5");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 3) + ")").addClass("yellow lighten-5");
                        }
                    }
                }
                else if (j % 3 === 2) {
                    // Get Shift End and Store Closing Time for Day
                    var end = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().split(":")[1]))).getTime(),
                        closed = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getTime() + new Date(res.week[today]["closedCustomers"]).getTime();
                    // Check if the Shift Ends at or After Store Closing
                    if (end >= closed) {
                        // Check for Valid Values in All Inputs
                        if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ") input").val().trim()) {
                            // Colour Cells Pink for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("pink lighten-5");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("pink lighten-5");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ")").addClass("pink lighten-5");
                        }
                    }
                }
                else if (j % 3 === 0) {
                    // Check for Valid Values in All Inputs
                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j - 1) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ") input").val().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ") input").val().trim()) {
                        // Check if Cells are Already Coloured
                        if (!$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").hasClass("lighten-5")) {
                            // Colour Cells Orange for Staff Member for Day
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j - 1) + ")").addClass("orange lighten-5");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("orange lighten-5");
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("orange lighten-5");
                        }
                    }
                    // Proceed to Next Day
                    n++;
                }
            });
        });
    }
    else {
        // Produce Error Message in Toast
        M.toast({
            html: "An unknown error occurred. The existing rota could not be fully loaded."
        });
    }
}

// Initialise Rota
$(document).ready(function() {
    // Loop Through Header Cells
    $("#rota thead tr:nth-of-type(2) td").each(function(i) {
        // Work Out Date Cell Represents
        var d = new Date(1547942400000 + (parseInt($("#header").data("week")) * 604800000) + ((parseInt($("#header").data("year")) - 2019) * 31536000000) - (Math.floor((parseInt($("#header").data("year")) - 2016) / 4) * 86400000) + (i * 86400000));
        // Show Date in Cell Header
        $(this).html(("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear());
    });
    // Get Rota Data from Server
    $.get("/rota/", {
        week: $("#header").data("week"),
        year: $("#header").data("year")
    }, function(res) {
        // Popupate Inputs or Produce Result Message in Toast
        switch (res.status) {
            case 200:
                // Loop Through Each Row of Table
                $("#rota tbody tr").each(function(i) {
                    // Get Data from HTML
                    var staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1],
                        shifts = res.rota.filter(function(x) { return x.staffNumber == staffNumber; });

                    // Loop Through Each Day
                    for (var j = 1; j <= 7; j++) {
                        // Define Start and End Timestamps of Day
                        var lower = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]))).getTime();
                        var higher = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]), 23, 59, 59)).getTime();
                        // Loop Through Shifts
                        for (var shift of shifts) {
                            // Check if Shift Falls within Day
                            if (shift.start > lower && shift.start < higher) {
                                // Populate Cells with Shift Data
                                $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((3 * j) - 1) + ") input").val(("0" + new Date(shift.start).getUTCHours()).slice(-2) + ":" + ("0" + new Date(shift.start).getUTCMinutes()).slice(-2));
                                $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((3 * j)) + ") input").val(("0" + new Date(shift.end).getUTCHours()).slice(-2) + ":" + ("0" + new Date(shift.end).getUTCMinutes()).slice(-2));
                                $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((3 * j) + 1) + ") input").val(shift.breaks);
                            }
                        }
                    }
                });
                // Get Week and Event Data from Server - Then Colour Rota Cells and Enable/Disable Inputs
                makeRequest();
                // Remove Loading Circle
                $("#loading").fadeOut("fast", function() {
                    // Show Rota
                    $("#wrapper").fadeIn();
                    // Prevent Page Overflow
                    stopOverflow();
                });
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
});

// Handle Input Updates
$(document).delegate("#rota input", "change", function() {
    // Colour Rota Cells and Enable/Disable Inputs
    colour(week, events);
});

// Handle Change Week Button
$("#change").click(function() {
    // Click Rota Search Button in Sidebar (Trigger Partial Change)
    $(".sidenav a[data-page='rota']").click();
});

// Handle Previous Week Button
$("#previous").click(function() {
    // Get Data from HTML
    var week = $("#header").data("week") - 1,
        year = $("#header").data("year");

    // Check if Week Number is Too Low
    if (week < 1) {
        // Reset Week Number to 52
        week = 52;
        // Decrement Year
        year -= 1;
    }

    // Get Partial HTML from Server
    $.get("/partial/rota_manage", {
        week: week,
        year: year
    }, function(res) {
        // Fade Out Page Content
        $("#content").fadeOut("fast", function() {
            // Change Page Content HTML
            $("#content").html(res);
            // Destroy All Tooltips on Page
            $('.material-tooltip').remove();
            // Initialise Materialize Elements
            M.AutoInit();
            // Fade in Page Content
            $("#content").fadeIn("fast", function() {
                // Prevent Page Overflow
                stopOverflow();
            });
        });
    });
});

// Handle Next Week Button
$("#next").click(function() {
    // Get Data from HTML
    var week = $("#header").data("week") + 1,
        year = $("#header").data("year");

    // Check if Week Number is Too High
    if (week > 52) {
        // Reset Week Number to 1
        week = 1;
        // Increment Year
        year += 1;
    }

    // Get Partial HTML from Server
    $.get("/partial/rota_manage", {
        week: week,
        year: year
    }, function(res) {
        // Fade Out Page Content
        $("#content").fadeOut("fast", function() {
            // Change Page Content HTML
            $("#content").html(res);
            // Destroy All Tooltips on Page
            $('.material-tooltip').remove();
            // Initialise Materialize Elements
            M.AutoInit();
            // Fade in Page Content
            $("#content").fadeIn("fast", function() {
                // Prevent Page Overflow
                stopOverflow();
            });
        });
    });
});

// Handle Verify Button
$("#verify").click(function() {
    // Send Shift Data to Server
    $.post("/rota/verify/", {
        weekNumber: $("#header").data("week"),
        year: $("#header").data("year"),
        shifts: build("verify")
    }, function(res) {
        // Render Popup or Produce Result Message in Toast
        switch (res.status) {
            case 200:
                // Clear List of Warnings
                $("#errors").html("");
                // Show Totals of Each Type of Warning/Notices
                $("#critical").html(res.errors.critical.length);
                $("#warning").html(res.errors.warning.length);
                $("#concern").html(res.errors.concern.length);
                $("#information").html(res.errors.information.length);
                // Render Each Warnings/Notices in Order of Type
                for (var error of res.errors.critical) {
                    $("#errors").append("<tr><td class=\"red-text text-darken-4\"><i class=\"material-icons\">cancel</i></td><td class=\"red-text text-darken-4\">Critical Error</td><td class=\"red-text text-darken-4\">" + error +  "</td></tr>");
                }
                for (var error of res.errors.warning) {
                    $("#errors").append("<tr><td class=\"orange-text text-darken-4\"><i class=\"material-icons\">warning</i></td><td class=\"orange-text text-darken-4\">Warning</td><td class=\"orange-text text-darken-4\">" + error +  "</td></tr>");
                }
                for (var error of res.errors.concern) {
                    $("#errors").append("<tr><td class=\"lime-text text-darken-4\"><i class=\"material-icons\">priority_high</i></td><td class=\"lime-text text-darken-4\">Concern</td><td class=\"lime-text text-darken-4\">" + error +  "</td></tr>");
                }
                for (var error of res.errors.information) {
                    $("#errors").append("<tr><td class=\"blue-text text-darken-4\"><i class=\"material-icons\" style=\"width: 25px;\">information</i></td><td class=\"blue-text text-darken-4\">Information</td><td class=\"blue-text text-darken-4\">" + error +  "</td></tr>");
                }
                // Show Popup
                $("#modal-errors").modal("open");
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
});

// Handle Save Button
$("#save").click(function() {
    // Send Shift Data to Server
    $.post("/rota/save/", {
        weekNumber: $("#header").data("week"),
        year: $("#header").data("year"),
        publish: false,
        shifts: build("provisional")
    }, function(res) {
        // Produce Result Message in Toast
        switch (res.status) {
            case 200:
                M.toast({
                    html: "The rota has been saved."
                });
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
});

// Handle Publish Button
$("#publish").click(function() {
    // Send Shift Data to Server
    $.post("/rota/save/", {
        weekNumber: $("#header").data("week"),
        year: $("#header").data("year"),
        publish: true,
        shifts: build("publish")
    }, function(res) {
        // Produce Result Message in Toast
        switch (res.status) {
            case 200:
                M.toast({
                    html: "The rota has been saved and published."
                });
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
});

// Handle Export Button
$("#export").click(function() {
    // Get Data from Input Values
    var from_week = $("#export-from-week").val(),
        from_year = $("#export-from-year").val(),
        to_week = $("#export-to-week").val(),
        to_year = $("#export-to-year").val();

    // Check Parameters are Valid
    if (from_week && from_year && to_week && to_year && !isNaN(from_week) && !isNaN(from_year) && !isNaN(to_week) && !isNaN(to_year) && from_week >= 1 && from_week <= 52 && from_year >= 2019 && to_week >= 1 && to_week <= 52 && to_year >= 2019) {
        // Open Download Popup
        window.open("/rota/export?from_week=" + from_week + "&from_year=" + from_year + "&to_week=" + to_week + "&to_year=" + to_year);
    }
    else {
        // Produce Error Message in Toast
        M.toast({
            html: "Please fill out all fields with valid values."
        });
    }
});

// Handle Save Week Settings Button
$("#save-week").click(function() {
    // Get Data from Input Values
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
    };

    // Check Parameters are Valid
    var invalid = false;
    for (var day of Object.keys(week)) {
        if (!week[day].openCustomers || !week[day].closedCustomers || !week[day].openStaff || !week[day].closedStaff) {
            invalid = true;
        }
    }
    // Check if Invalid Parameter Found
    if (invalid === false) {
        // Get Data from HTML
        week.weekNumber = $("#header").data("week");
        week.year = $("#header").data("year");
        // Send Week Data to Server
        $.post("/week/", week, function(res) {
            // Produce Result Message in Toast
            switch (res.status) {
                case 200:
                    // Close Popup
                    $("#modal-settings").modal("close");
                    // Get Week and Event Data from Server - Then Colour Rota Cells and Enable/Disable Inputs
                    makeRequest();
                    M.toast({
                        html: "The week settings have been saved."
                    });
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