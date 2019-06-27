// Module Imports
var express = require("express"),
    session = require("express-session"),
    expressNunjucks = require("express-nunjucks"),
    nunjucks = require("nunjucks"),
    nunjucksEnv = new nunjucks.Environment(),
    mongodb = require("express-mongo-db"),
    bodyParser = require("body-parser"),
    cookieParser = require("cookie-parser"),
    sendmail = require('sendmail')({ silent: true }),
    excel = require("excel4node"),
    config = require("./config.json"),
    package = require("./package.json");

// Setup Express App
var app = express();

// Configure Templating Engine
var njk = expressNunjucks(app, {
    watch: true,
    noCache: true,
    filters: {
        date: function(d) {
            return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
        },
        toDate: function(t) {
            var d = new Date(t);
            return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
        },
        time: function(d) {
            return ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + (d.getUTCMinutes())).slice(-2);
        }
    }
});

// Add Additional Filters for Emails
nunjucksEnv.addFilter("date", function(d) {
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
});
nunjucksEnv.addFilter("toDate", function(t) {
    var d = new Date(t);
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
});
nunjucksEnv.addFilter("toTime", function(t) {
    var d = new Date(t);
    return ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + (d.getUTCMinutes())).slice(-2);
});
nunjucksEnv.addFilter("toDay", function(t) {
    var d = new Date(t),
        days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[d.getDay()];
});

// Configure Express App
app.set("views", __dirname + "/views");
app.use(express.static(__dirname + "/pub"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: config.app.secret,
    resave: false,
    saveUninitialized: false
}));

// Gonfigure Database
app.use(mongodb("mongodb://localhost/rotait"));

// App Local Variables
app.locals = {
    version: package.version
};

// Session Local Variables
app.get("*", function(req, res, next) {
    res.locals = req.session;
    next();
});

// Get Main Page
app.get("/", function(req, res) {
    // Render Main Template
    res.render("template");
});

// Get Partial - Team
app.get("/partial/staff/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get User's Data from Database
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Get and Sort Staff from Same Team as User
            req.db.collection("users").find({
                team: resp.team
            }, {
                sort: [["firstName", "ascending"]]
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Convert Cursor to Array
                resp.toArray().then(function(team) {
                    // Send Partial
                    res.render("partials/staff", {
                        team: team
                    });
                });
            });
        });
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Manage Staff
app.get("/partial/staff_manage/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query && req.query.staffNumber) {
            // Get Data about Staff Member from Database
            req.db.collection("users").findOne({
                staffNumber: req.query.staffNumber
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Check if Response Found
                if (resp) {
                    // Convet Date of Birth to HTML Format
                    resp.dob = resp.dob.getFullYear() + "-" + ("0" + (resp.dob.getMonth() + 1)).slice(-2) + "-" + ("0" + resp.dob.getDate()).slice(-2);
                    // Send Partial
                    res.render("partials/staff_manage", { edit: true, user: resp });
                }
                else {
                    // Send Error Partial
                    res.render("partials/error", {
                        code: 400,
                        message: "An unknown error occurred. Please try again later."
                    });
                }
            });
        }
        else {
            // Re-Send Original Partial
            res.render("partials/staff_manage");
        }
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Rota Search
app.get("/partial/rota/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Send Partial
        res.render("partials/rota_search");
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Rota Manage
app.get("/partial/rota_manage/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.week && req.query.year && !isNaN(parseInt(req.query.week)) && !isNaN(parseInt(req.query.year))) {
            // Convert Parameters to Integers
            req.query.week = parseInt(req.query.week);
            req.query.year = parseInt(req.query.year);
            // Check Request Parameters are Valid
            if (req.query.year >= 2000 && req.query.week >= 1 && req.query.week <= 52) {
                // Get User's Data from Database
                req.db.collection("users").findOne({
                    staffNumber: req.session.loggedin
                }, function(err, resp) {
                    // Handle Database Connection Failures
                    if (err) {
                        res.render("partials/error", {
                            code: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    // Define Limit of When a Week is in the Past
                    var limit = new Date(1547942400000 + (parseInt((req.query.week + 1) * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
                    // Check if Week is in the Past
                    if (limit < Date.now()) {
                        // Get Week Data from Database
                        req.db.collection("weeks").findOne({
                            weekNumber: req.query.week,
                            year: req.query.year
                        }, function(err, week) {
                            // Handle Database Connection Failures
                            if (err) {
                                res.render("partials/error", {
                                    code: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            // Check if Week is Published
                            if (week && week.published === true) {
                                // Prepare Array of Users
                                var users = [];
                                // Get Week's Shift Data from Database
                                req.db.collection("shifts").find({
                                    weekNumber: req.query.week,
                                    year: req.query.year
                                }, function(err, resp) {
                                    // Handle Database Connection Failures
                                    if (err) {
                                        res.render("partials/error", {
                                            code: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    } 
                                    // Convert Cursor to Array
                                    resp.toArray().then(function(shifts) {
                                        // Define Start and End Timestamps of Week
                                        var start = new Date(1547942400000 + (parseInt(req.query.week * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000),
                                            end = new Date(1547942400000 + (parseInt(req.query.week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
                                        // Get Week's Event Data from Database
                                        req.db.collection("events").find({
                                            $or: [
                                                { $and: [
                                                        {
                                                            from: {
                                                                $lte: start
                                                            }
                                                        },
                                                        {
                                                            to: {
                                                                $gte: start
                                                            }
                                                        }
                                                    ] 
                                                },
                                                {
                                                    $and: [
                                                        {
                                                            from: {
                                                                $gte: start
                                                            }
                                                        },
                                                        {
                                                            from: {
                                                                $lte: end
                                                            }
                                                        }
                                                    ]
                                                }
                                            ]
                                        }, function(err, resp) {
                                            // Handle Database Connection Failures
                                            if (err) {
                                                res.render("partials/error", {
                                                    code: 500,
                                                    message: "The system could not contact the server. Please try again later."
                                                });
                                                return;
                                            } 
                                            // Convert Cursor to Array
                                            resp.toArray().then(function(events) {
                                                // Loop Through Shifts
                                                for (var shift of shifts) {
                                                    // Determine if Shift's Staff Member is in User Array
                                                    if (users.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber) === -1) {
                                                        // Add Shift's Staff Member to User Array
                                                        users.push({
                                                            firstName: shift.fullName.split(" ")[0],
                                                            lastName: shift.fullName.split(" ")[1],
                                                            staffNumber: shift.staffNumber
                                                        });
                                                    }
                                                }
                                                // Loop Through Events
                                                for (var event of events) {
                                                    // Determine if Event's Staff Member is in User Array
                                                    if (users.map(function(x) { return x.staffNumber; }).indexOf(event.staffNumber) === -1) {
                                                        // Add Event's Staff Member to User Array
                                                        users.push({
                                                            firstName: event.fullName.split(" ")[0],
                                                            lastName: event.fullName.split(" ")[1],
                                                            staffNumber: event.staffNumber
                                                        });
                                                    }
                                                }
                                                // Sort Users Array Alphabetically
                                                users.sort(function(a, b) {
                                                    if (a.firstName < b.firstName) {
                                                        return -1;
                                                    }
                                                    if (a.firstName > b.firstName) {
                                                        return 1;
                                                    }
                                                    return 0;
                                                });
                                                // Send Partial
                                                res.render("partials/rota_manage", {
                                                    team: users,
                                                    week: week,
                                                    past: true
                                                });
                                            });
                                        });
                                    });
                                });
                            }
                            else {
                                // Send Error Partial
                                res.render("partials/error", {
                                    code: 400,
                                    message: "No rota was published for this week."
                                });
                            }
                        });
                    }
                    else {
                        // Get and Sort Staff from Same Team as User
                        req.db.collection("users").find({
                            team: resp.team
                        }, {
                            sort: [["firstName", "ascending"]]
                        }, function(err, resp) {
                            // Handle Database Connection Failures
                            if (err) {
                                res.render("partials/error", {
                                    code: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            // Convert Cursor to Array
                            resp.toArray().then(function(team) {
                                // Get Week Data from Database
                                req.db.collection("weeks").findOne({
                                    weekNumber: req.query.week,
                                    year: req.query.year
                                }, function(err, week) {
                                    // Handle Database Connection Failures
                                    if (err) {
                                        res.render("partials/error", {
                                            code: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    } 
                                    // Check if Week Data Exists
                                    if (!week) {
                                        // Generate New Week Data Object
                                        var newWeek = true;
                                        week = {
                                            weekNumber: req.query.week,
                                            year: req.query.year,
                                            published: false,
                                            sun: {
                                                closed: false,
                                                bankHoliday: false,
                                                openCustomers: new Date(36000000),
                                                closedCustomers: new Date(57600000),
                                                openStaff: new Date(25200000),
                                                closedStaff: new Date(68400000)
                                            },
                                            mon: {
                                                closed: false,
                                                bankHoliday: false,
                                                openCustomers: new Date(25200000),
                                                closedCustomers: new Date(75600000),
                                                openStaff: new Date(21600000),
                                                closedStaff: new Date(82800000)
                                            },
                                            tue: {
                                                closed: false,
                                                bankHoliday: false,
                                                openCustomers: new Date(25200000),
                                                closedCustomers: new Date(75600000),
                                                openStaff: new Date(21600000),
                                                closedStaff: new Date(82800000)
                                            },
                                            wed: {
                                                closed: false,
                                                bankHoliday: false,
                                                openCustomers: new Date(25200000),
                                                closedCustomers: new Date(75600000),
                                                openStaff: new Date(21600000),
                                                closedStaff: new Date(82800000)
                                            },
                                            thu: {
                                                closed: false,
                                                bankHoliday: false,
                                                openCustomers: new Date(25200000),
                                                closedCustomers: new Date(75600000),
                                                openStaff: new Date(21600000),
                                                closedStaff: new Date(82800000)
                                            },
                                            fri: {
                                                closed: false,
                                                bankHoliday: false,
                                                openCustomers: new Date(25200000),
                                                closedCustomers: new Date(75600000),
                                                openStaff: new Date(21600000),
                                                closedStaff: new Date(82800000)
                                            },
                                            sat: {
                                                closed: false,
                                                bankHoliday: false,
                                                openCustomers: new Date(25200000),
                                                closedCustomers: new Date(72000000),
                                                openStaff: new Date(21600000),
                                                closedStaff: new Date(72900000)
                                            }
                                        };
                                    }
                                    // Send Partial
                                    res.render("partials/rota_manage", {
                                        team: team,
                                        week: week,
                                        past: false
                                    });
                                    // Add Week Data Object to Database 
                                    if (newWeek) {
                                        req.db.collection("weeks").insertOne(week);
                                    }
                                });
                            });
                        });
                    }
                });
            }
            else {
                // Send Error Partial
                res.render("partials/error", {
                    code: 400,
                    message: "The week number or year was invalid."
                });
            }
        }
        else {
            // Send Error Partial
            res.render("partials/error", {
                code: 400,
                message: "The week number or year was invalid."
            });
        }
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "Authentication with the server failed. Please try again later."
        });
    }
});

// Get Partial - Pending Requests
app.get("/partial/requests/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get Current Date at Midnight
        var d = new Date();
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
        // Get and Sort All Event Data from Database
        req.db.collection("events").find({
                type: "leave",
                status: "pending",
                team: req.session.team
            }, {
                sort: [["from", "ascending"]]
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Convert Cursor to Array
                resp.toArray().then(function(requests) {
                    // Send Partial
                    res.render("partials/requests", {
                        requests: requests
                    });
                });
            });
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Additional Events
app.get("/partial/events/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get Current Date at Midnight
        var d = new Date();
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
        // Get and Sort All Event Data from Database
        req.db.collection("events").find({
                $or: [
                    {
                        type: {
                            $not: {
                                $eq: "leave"
                            }
                        }
                    },
                    {
                        status: "fixed"
                    }
                ],
                to: {
                    $gt: d.getTime()
                },
                team: req.session.team
            }, {
                sort: [["from", "ascending"]]
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Convert Cursor to Array
                resp.toArray().then(function(events) {
                    res.render("partials/events", {
                        events: events
                    });
                });
            });
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Additional Event
app.get("/partial/events_manage/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get User's Data from Database
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Get and Sort Staff from Same Team as User
            req.db.collection("users").find({
                team: resp.team
            }, {
                sort: [["firstName", "ascending"]]
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Convert Cursor to Array
                resp.toArray().then(function(team) {
                    // Check if Request is an Edit
                    if (req.query && req.query.staffNumber && req.query.type && req.query.from && !isNaN(parseInt(req.query.from)) && req.query.to && !isNaN(parseInt(req.query.to))) {
                        // Convert Parameters to Integers
                        req.query.from = parseInt(req.query.from);
                        req.query.to = parseInt(req.query.to);
                        // Get Event Data from Database
                        req.db.collection("events").findOne({
                            staffNumber: req.query.staffNumber,
                            type: req.query.type,
                            from: req.query.from,
                            to: req.query.to
                        }, function(err, resp) {
                            // Handle Database Connection Failures
                            if (err) {
                                res.render("partials/error", {
                                    code: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            // Convert Dates to HTML Format
                            resp.from_html = new Date(resp.from);
                            resp.to_html = new Date(resp.to);
                            resp.from_html = resp.from_html.getFullYear() + "-" + ("0" + (resp.from_html.getMonth() + 1)).slice(-2) + "-" + ("0" + resp.from_html.getDate()).slice(-2);
                            resp.to_html = resp.to_html.getFullYear() + "-" + ("0" + (resp.to_html.getMonth() + 1)).slice(-2) + "-" + ("0" + resp.to_html.getDate()).slice(-2);
                            // Send Partial
                            res.render("partials/events_manage", {
                                team: team,
                                edit: true,
                                event: resp
                            });
                        });
                    }
                    else {
                        // Send Partial
                        res.render("partials/events_manage", {
                            team: team
                        });
                    }
                });
            });
        });
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Week Data
app.get("/week/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.week && req.query.year) {
            // Get User's Data from Database
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Check if User is a Manager
                if (resp.manager === true) {
                    // Convert Parameters to Integers
                    req.query.week = parseInt(req.query.week);
                    req.query.year = parseInt(req.query.year);
                    // Get Week Data
                    req.db.collection("weeks").findOne({
                        weekNumber: req.query.week,
                        year: req.query.year
                    }, function(err, week) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Send Data
                        res.send({
                            status: 200,
                            week: week
                        });
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Get Rota Data
app.get("/rota/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.week && req.query.year) {
            // Get User's Data from Database
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Check if User is a Manager
                if (resp.manager === true) {
                    // Convert Parameters to Integers
                    req.query.week = parseInt(req.query.week);
                    req.query.year = parseInt(req.query.year);
                    // Get Shift Data from Database
                    req.db.collection("shifts").find({
                        weekNumber: req.query.week,
                        year: req.query.year
                    }, function(err, shifts) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Convert Cursor to Array
                        shifts.toArray().then(function(rota) {
                            // Send Data
                            res.send({
                                status: 200,
                                rota: rota
                            });
                        });
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Get Event Data
app.get("/events/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.week && req.query.year) {
            // Get User's Data from Database
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Check if User is a Manager
                if (resp.manager === true) {
                    // Define Start and End Timestamps of Week
                    var start = new Date(1547942400000 + (parseInt(req.query.week * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000),
                        end = new Date(1547942400000 + (parseInt(req.query.week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
                    // Get Event Data from Database
                    req.db.collection("events").find({
                        $or: [
                            { $and: [
                                    {
                                        from: {
                                            $lte: start
                                        }
                                    },
                                    {
                                        to: {
                                            $gte: start
                                        }
                                    }
                                ] 
                            },
                            {
                                $and: [
                                    {
                                        from: {
                                            $gte: start
                                        }
                                    },
                                    {
                                        from: {
                                            $lte: end
                                        }
                                    }
                                ]
                            }
                        ]
                    }, function(err, resp) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Convert Cursor to Array
                        resp.toArray().then(function(events) {
                            // Send Data
                            res.send({
                                status: 200,
                                events: events
                            });
                        });
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Rota Export Requests
app.get("/rota/export/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.from_week && req.query.from_year && req.query.to_week && req.query.to_year) {
            // Convert Parameters to Integers
            req.query.from_week = parseInt(req.query.from_week);
            req.query.from_year = parseInt(req.query.from_year);
            req.query.to_week = parseInt(req.query.to_week);
            req.query.to_year = parseInt(req.query.to_year);
            // Check Request Parameters are Valid
            if (!isNaN(req.query.from_week) && !isNaN(req.query.from_year) && !isNaN(req.query.to_week) && !isNaN(req.query.to_year) && req.query.from_week >= 1 && req.query.from_week <= 52 && req.query.from_year >= 2019 && req.query.to_week >= 1 && req.query.to_week <= 52 && req.query.to_year >= 2019) {
                var from = req.query.from_week + ((req.query.from_year - 2019) * 52),
                    to = req.query.to_week + ((req.query.to_year - 2019) * 52);
                // Check Request Parameters are Valid
                if (from <= to) {
                    // Get User's Data from Database
                    req.db.collection("users").findOne({
                        staffNumber: req.session.loggedin
                    }, function(err, resp) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.render("partials/error", {
                                code: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Define Variables for Use in Loops
                        var users = [],
                            query = [],
                            i = req.query.from_week,
                            j = req.query.from_year;
                        // Build Database Query
                        while (i <= req.query.to_week || j < req.query.to_year) {
                            query.push({
                                weekNumber: i,
                                year: j
                            });
                            i++;
                            // Proceed to Next Year if No More Weeks
                            if (i > 52) {
                                i = 1;
                                j++;
                            }
                        }
                        // Get Week Data from Database
                        req.db.collection("weeks").find({
                            $or: query
                        }, function(err, resp) {
                            // Convert Cursor to Array
                            resp.toArray().then(function(weeks) {
                                // Get Shift Data from Database
                                req.db.collection("shifts").find({
                                    $or: query
                                }, function(err, resp) {
                                    // Handle Database Connection Failures
                                    if (err) {
                                        res.render("partials/error", {
                                            code: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    }
                                    // Convert Cursor to Array 
                                    resp.toArray().then(function(shifts) {
                                        // Define Start and End Timestamps of Week
                                        var start = new Date(1547942400000 + (parseInt(req.query.from_week * 604800000))).getTime() + ((parseInt(req.query.from_year) - 2019) * 31536000000),
                                            end = new Date(1547942400000 + (parseInt(req.query.to_week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.to_year) - 2019) * 31536000000);
                                        // Get Event Data from Database
                                        req.db.collection("events").find({
                                            $or: [
                                                { $and: [
                                                        {
                                                            from: {
                                                                $lte: start
                                                            }
                                                        },
                                                        {
                                                            to: {
                                                                $gte: start
                                                            }
                                                        }
                                                    ] 
                                                },
                                                {
                                                    $and: [
                                                        {
                                                            from: {
                                                                $gte: start
                                                            }
                                                        },
                                                        {
                                                            from: {
                                                                $lte: end
                                                            }
                                                        }
                                                    ]
                                                }
                                            ]
                                        }, function(err, resp) {
                                            // Handle Database Connection Failures
                                            if (err) {
                                                res.render("partials/error", {
                                                    code: 500,
                                                    message: "The system could not contact the server. Please try again later."
                                                });
                                                return;
                                            }
                                            // Convert Cursor to Array
                                            resp.toArray().then(function(events) {
                                                // Loop Through Shifts
                                                for (var shift of shifts) {
                                                    // Determine if Shift's Staff Member is in User Array
                                                    if (users.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber) === -1) {
                                                        // Add Shift's Staff Member to User Array
                                                        users.push({
                                                            firstName: shift.fullName.split(" ")[0],
                                                            lastName: shift.fullName.split(" ")[1],
                                                            staffNumber: shift.staffNumber
                                                        });
                                                    }
                                                }
                                                // Loop Through Events
                                                for (var event of events) {
                                                    // Determine if Event's Staff Member is in User Array
                                                    if (users.map(function(x) { return x.staffNumber; }).indexOf(event.staffNumber) === -1) {
                                                        // Add Event's Staff Member to User Array
                                                        users.push({
                                                            firstName: event.fullName.split(" ")[0],
                                                            lastName: event.fullName.split(" ")[1],
                                                            staffNumber: event.staffNumber
                                                        });
                                                    }
                                                }
                                                // Sort Users Array Alphabetically
                                                users.sort(function(a, b) {
                                                    if (a.firstName < b.firstName) {
                                                        return -1;
                                                    }
                                                    if (a.firstName > b.firstName) {
                                                        return 1;
                                                    }
                                                    return 0;
                                                });
                                                // Build Excel Workbook Data
                                                var workbook = new excel.Workbook({
                                                  defaultFont: {
                                                    size: 11
                                                  },
                                                  dateFormat: "dd/mm/yyyy hh:mm:ss",
                                                  workbookView: {
                                                    showSheetTabs: false
                                                  },
                                                  author: req.session.name
                                                }),
                                                    spreadsheet = workbook.addWorksheet("Rota", {
                                                        printOptions: {
                                                            centerHorizontal: true,
                                                            centerVertical: true
                                                        },
                                                        pageSetup: {
                                                            blackAndWhite: false,
                                                            fitToHeight: 1,
                                                            fitToWidth: 1,
                                                            orientation: "landscape"
                                                        },
                                                        sheetFormat: {
                                                            defaultColWidth: 9
                                                        }
                                                    }),
                                                    row = 1,
                                                    i = req.query.from_week,
                                                    j = req.query.from_year,
                                                    days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                                                    styles = {
                                                        header: {
                                                            alignment: {
                                                                horizontal: "center",
                                                                vertical: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "F2F2F2"
                                                            }
                                                        },
                                                        user: {
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "F2F2F2"
                                                            }
                                                        },
                                                        early: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "FFFF97"
                                                            }
                                                        },
                                                        middle: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "FFD797"
                                                            }
                                                        },
                                                        late: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "F8BACC"
                                                            }
                                                        },
                                                        leave: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "BBDEFB"
                                                            }
                                                        },
                                                        medical: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "D29DDB"
                                                            }
                                                        },
                                                        suspension: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "F44336"
                                                            }
                                                        },
                                                        admin: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "A9D08E"
                                                            }
                                                        },
                                                        elsewhere: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "808080"
                                                            }
                                                        }
                                                    };

                                                spreadsheet.column(1).setWidth(18);
                                                // Loop Through Each Week in Selection
                                                while (i <= req.query.to_week || j < req.query.to_year) {
                                                    // Store Where Headers for Week End
                                                    var first = row;
                                                    // Define First Row Headers (Week Number & Days)
                                                    spreadsheet.cell(row, 1, row, 16).style({ border: { top: { style: "thick" } } });
                                                    spreadsheet.cell(row, 1, row, 2, true).string("Week " + i).style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" }, left: { style: "thick" } } });
                                                    spreadsheet.cell(row, 3, row, 4, true).string("Sunday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 5, row, 6, true).string("Monday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 7, row, 8, true).string("Tuesday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 9, row, 10, true).string("Wednesday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 11, row, 12, true).string("Thursday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 13, row, 14, true).string("Friday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 15, row, 16, true).string("Saturday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    row++;
                                                    // Define Second Row Headers (Name, Staff Number & Dates)
                                                    var d = new Date(new Date(1547942400000 + (parseInt(i * 604800000))).getTime() + ((parseInt(j) - 2019) * 31536000000));
                                                    spreadsheet.cell(row, 1, row + 1, 1, true).string("Name").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thin" }, left: { style: "thick" } } });
                                                    spreadsheet.cell(row, 2, row + 1, 2, true).string("Staff No.").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thick" } } });
                                                    for (var n = 2; n <= 14; n += 2) {
                                                        spreadsheet.cell(row, n + 1, row, n + 2, true).string(("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear()).style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                        d.setDate(d.getDate() + 1);
                                                    }
                                                    row++;
                                                    // Define Third Row Headers (In & Out)
                                                    for (var n = 2; n <= 14; n += 2) {
                                                        spreadsheet.cell(row, n + 1).string("In").style(styles.header).style({ border: { bottom: { style: "thick" }, left: { style: "thick" }, right: { style: "thin" } } });
                                                        spreadsheet.cell(row, n + 2).string("Out").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thick" } } });
                                                    }
                                                    row++;
                                                    // Define Variables for Use in Loops
                                                    var m = 0,
                                                        border = "thin",
                                                        changed;
                                                    // Loop Through Each Staff Member
                                                    for (var user of users) {
                                                        // Set Flag if Any Data is Shown for User
                                                        changed = false;
                                                        // Generate Thick Border Every 4 Staff Members
                                                        if (m === 3) {
                                                            border = "thick";
                                                        }
                                                        else {
                                                            border = "thin";
                                                        }
                                                        // Show Full Name
                                                        spreadsheet.cell(row, 1).string(user.firstName + " " + user.lastName).style(styles.user).style({ border: { bottom: { style: border }, right: { style: "thin" }, left: { style: "thick" } } });
                                                        // Show Staff Number
                                                        spreadsheet.cell(row, 2).string(user.staffNumber).style(styles.user).style({ border: { bottom: { style: border }, right: { style: "thick" } } });
                                                        // Loop Through Each Day (2 Columns)
                                                        var col = 1;
                                                        for (var n = 0; n < 7; n++) {
                                                            col = col + 2;
                                                            // Define Key Date Information
                                                            var start = new Date(new Date(1547942400000 + (parseInt(i * 604800000))).getTime() + (n * 86400000) + ((parseInt(j) - 2019) * 31536000000)),
                                                                end = new Date(start),
                                                                week = weeks[weeks.map(function(x) { return x.weekNumber; }).indexOf(i)],
                                                                values = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                                            end.setUTCHours(23, 59, 59);
                                                            // Set Thin Border Between In & Out Boxes, and Thick Border between Days
                                                            spreadsheet.cell(row, col).style({ border: { bottom: { style: border }, right: { style: "thin" } } });
                                                            spreadsheet.cell(row, col + 1).style({ border: { bottom: { style: border }, right: { style: "thick" } } });
                                                            // Handle Days Where Store is Closed
                                                            if (week[days[n]].closed === true) {
                                                                // Show (C) in Header
                                                                spreadsheet.cell(first, col, first, col + 1, true).string(values[n] + " (C)");
                                                                // Show Hashed Background in Cells
                                                                spreadsheet.cell(row, col).style({ 
                                                                    fill: {
                                                                        type: "pattern",
                                                                        patternType: "darkUp"
                                                                    } 
                                                                });
                                                                spreadsheet.cell(row, col + 1).style({ 
                                                                    fill: {
                                                                        type: "pattern",
                                                                        patternType: "darkUp"
                                                                    } 
                                                                });
                                                                // Proceed to Next Day
                                                                continue;
                                                            }
                                                            if (week[days[n]].bankHoliday === true) {
                                                                // Show (BH) in Header
                                                                spreadsheet.cell(first, col, first, col + 1, true).string(values[n] + " (BH)");
                                                            }
                                                            // Loop Through Shifts
                                                            for (var shift of shifts) {
                                                                // Determine if Shift is Within Current Day
                                                                if (shift.start > start.getTime() && shift.end < end.getTime() && shift.staffNumber == user.staffNumber) {
                                                                    // Define Key Date Information
                                                                    var s = new Date(shift.start),
                                                                        e = new Date(shift.end),
                                                                        style;
                                                                    s.setUTCFullYear(1970, 0, 1);
                                                                    e.setUTCFullYear(1970, 0, 1);
                                                                    // Set Cell Style Based on Shift Type
                                                                    if (n === 0) {
                                                                        style = styles.middle;
                                                                    }
                                                                    else if (s.getTime() <= week[days[n]].openCustomers.getTime()) {
                                                                        style = styles.early;
                                                                    }
                                                                    else if (e.getTime() >= week[days[n]].closedCustomers.getTime()) {
                                                                        style = styles.late;
                                                                    }
                                                                    else {
                                                                        style = styles.middle;
                                                                    }
                                                                    // Set Cell Values to Times
                                                                    spreadsheet.cell(row, col).string(("0" + s.getUTCHours()).slice(-2) + ":" + ("0" + (s.getUTCMinutes())).slice(-2)).style(style);
                                                                    spreadsheet.cell(row, col + 1).string(("0" + e.getUTCHours()).slice(-2) + ":" + ("0" + (e.getUTCMinutes())).slice(-2)).style(style);
                                                                    // Set Flag to Show Data Displayed for User
                                                                    changed = true;
                                                                }
                                                            }
                                                            // Loop Through Events
                                                            for (var event of events) {
                                                                // Determine if Event is Within Current Day
                                                                if (start.getTime() >= event.from && start.getTime() <= event.to && event.staffNumber == user.staffNumber) {
                                                                    var style;
                                                                    // Set Cell Style Based on Event Type
                                                                    if (event.type == "interviewing" || event.type == "course") {
                                                                        style = styles.admin;
                                                                    }
                                                                    if (event.type == "sickness" || event.type == "maternity" || event.type == "paternity") {
                                                                        style = styles.medical;
                                                                    }
                                                                    if (event.type == "leave" && (event.status == "approved" || event.status == "fixed")) {
                                                                        style = styles.leave;
                                                                    }
                                                                    if (event.type == "suspension") {
                                                                        style = styles.suspension;
                                                                    }
                                                                    if (event.type == "elsewhere") {
                                                                        style = styles.elsewhere;
                                                                    }
                                                                    spreadsheet.cell(row, col).style(style);
                                                                    spreadsheet.cell(row, col + 1).style(style);
                                                                    // Set Flag to Show Data Displayed for User
                                                                    changed = true;
                                                                }
                                                            }
                                                        }
                                                        // Check if Data is Displayed for User
                                                        if (changed) {
                                                            // Increment Counter to Manage Thick Borders
                                                            m++;
                                                            if (m > 3) {
                                                                m = 0;
                                                            }
                                                        }
                                                        else {
                                                            // Hide Row
                                                            spreadsheet.row(row).hide();
                                                        }
                                                        row++;
                                                    }
                                                    // Add Thick Border to Bottom of Week
                                                    spreadsheet.cell(row, 1, row, 16).style({ border: { top: { style: "thick" } } });
                                                    i++;
                                                    // Proceed to Next Year if No More Weeks
                                                    if (i > 52) {
                                                        i = 1;
                                                        j++;
                                                    }
                                                    row++;
                                                }
                                                // Set Worksheet Print Area
                                                spreadsheet.setPrintArea(1, 1, row, 16);
                                                // Export Excel Spreadsheet
                                                workbook.write("Rota.xlsx", res);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 400,
                        message: "Invalid Parameters Sent"
                    });
                }
            }
            else {
                // Send Error
                res.send({
                    status: 400,
                    message: "Invalid Parameters Sent"
                });
            }
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Handle 404 Errors
app.get("*", function(req, res) {
    // Redirect Back to Root Page
    res.redirect("/");
});

// Accept Login Details
app.post("/login/", function(req, res) {
    // Search for Given Login Details in Database
    req.db.collection("users").findOne({
        staffNumber: req.body.staffNumber,
        password: req.body.password
    }, function(err, resp) {
        // Handle Database Connection Failures
        if (err) {
            res.send({
                status: 500,
                message: "The system could not contact the server. Please try again later."
            });
            return;
        } 
        // Check if Results Found
        if (resp) {
            // Check if User is a Manager
            if (resp.manager === true) {
                // Set Session Headers
                req.session.loggedin = resp.staffNumber;
                req.session.team = resp.team;
                req.session.name = resp.firstName + " " + resp.lastName;
                // Send Success Response
                res.send({
                    status: 200,
                    message: "Login Successful"
                });
            }
            else {
                // Send Error
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        }
        else {
            // Send Error
            res.send({
                status: 404,
                message: "User Account Not Found"
            });
        }
    });
});

// Add/Edit Users
app.post("/staff/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get User's Data from Database
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Check if User is a Manager
            if (resp.manager === true) {
                // Convert Parameter Data Types
                req.body.newUser = (req.body.newUser == "true");
                req.body.dob = new Date(req.body.dob + "Z");
                req.body.hours = parseFloat(req.body.hours);
                req.body.maxOvertime = parseFloat(req.body.maxOvertime);
                req.body.pay = parseFloat(req.body.pay);
                req.body.manager = false;
                req.body.reportsTo = req.session.loggedin;
                req.body.team = resp.team;
                for (var day of Object.keys(req.body.availability)) {
                    for (var time of Object.keys(req.body.availability[day])) {
                        req.body.availability[day][time] = (req.body.availability[day][time] == "true");
                    }
                }
                // Check Request Parameters are Valid
                if (req.body.firstName && req.body.lastName && !isNaN(req.body.dob.getTime()) && req.body.staffNumber && req.body.jobRole && req.body.email && !isNaN(req.body.hours) && !isNaN(req.body.maxOvertime) && !isNaN(req.body.hours && (!req.body.newUser || req.body.password))) {
                    // Search for Existing Users with Staff Number in Database
                    req.db.collection("users").findOne({
                        staffNumber: req.body.staffNumber
                    }, function(err, exists) {
                        // Check if Result was Found & Expected
                        if (exists && !req.body.newUser) {
                            // Destroy Unrequired Parameters
                            delete req.body.newUser;
                            delete req.body.password;
                            // Update Existing Record for User in Database
                            req.db.collection("users").updateOne({
                                staffNumber: req.body.staffNumber
                            }, {
                                $set: req.body
                            }, function(err, done) {
                                // Handle Database Connection Failures
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                // Check if Emails are Enabled
                                if (config.app.emails === true) {
                                    // Send Email to User
                                    sendmail({
                                        from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                        to: req.body.email,
                                        subject: "Your details have been updated.",
                                        html: nunjucksEnv.render("./emails/details.html", { user: req.body, type: "updated" })
                                    });
                                }
                                // Send Success Response
                                res.send({
                                    status: 200,
                                    message: "User Updated Successfully"
                                });
                            });
                        }
                        else if (exists && req.body.newUser) {
                            // Send Error
                            res.send({
                                status: 400,
                                message: "Staff Number in Use"
                            });
                        }
                        else {
                            // Destroy Unrequired Parameters
                            delete req.body.newUser;
                            // Add User Data to Database
                            req.db.collection("users").insertOne(req.body, function(err, done) {
                                // Handle Database Connection Failures
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                // Check if Emails are Enabled
                                if (config.app.emails === true) {
                                    // Send Email to User
                                    sendmail({
                                        from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                        to: req.body.email,
                                        subject: "Your details have been set.",
                                        html: nunjucksEnv.render("./emails/details.html", { user: req.body, type: "set" })
                                    });
                                }
                                // Send Success Response
                                res.send({
                                    status: 200,
                                    message: "User Added Successfully"
                                });
                            });
                        }
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 400,
                        message: "Missing Fields"
                    });
                }
            }
            else {
                // Send Error
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Password Reset Requests
app.post("/password/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.body.password) {
            // Get User's Data from Database
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Check User is a Manager
                if (resp.manager === true) {
                    // Update Password in Database
                    req.db.collection("users").updateOne({
                        staffNumber: req.body.staffNumber
                    }, {
                        $set: {
                            password: req.body.password
                        }
                    }, function(err, done) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Send Success Response
                        res.send({
                            status: 200,
                            message: "Password Updated Successfully"
                        });
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "No New Password Given"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Verify Rota Requests
app.post("/rota/verify/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.body.weekNumber && req.body.year && req.body.shifts) {
            // Get User's Data from Database
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Check User is a Manager
                if (resp.manager === true) {
                    // Convert Parameters to Integers
                    req.body.weekNumber = parseInt(req.body.weekNumber);
                    req.body.year = parseInt(req.body.year);
                    // Check Parameters are Valid
                    if (!isNaN(req.body.weekNumber) && !isNaN(req.body.year)) {
                        // Get Team Data from Database
                        req.db.collection("users").find({
                            team: resp.team
                        }, function(err, resp) {
                            // Handle Database Connection Failures
                            if (err) {
                                res.send({
                                    status: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            // Convert Cursor to Array
                            resp.toArray().then(function(team) {
                                // Get Week Data from Database
                                req.db.collection("weeks").findOne({
                                    weekNumber: req.body.weekNumber,
                                    year: req.body.year
                                }, function(err, week) {
                                    // Handle Database Connection Failures
                                    if (err) {
                                        res.send({
                                            status: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    } 
                                    // Define Start and End Timestamps of Week
                                    var start = new Date(1547942400000 + (parseInt(req.body.weekNumber * 604800000))).getTime() + ((parseInt(req.body.year) - 2019) * 31536000000),
                                        end = new Date(1547942400000 + (parseInt(req.body.weekNumber * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.body.year) - 2019) * 31536000000);
                                    // Get Week's Event Data from Database
                                    req.db.collection("events").find({
                                        $or: [
                                            { $and: [
                                                    {
                                                        from: {
                                                            $lte: start
                                                        }
                                                    },
                                                    {
                                                        to: {
                                                            $gte: start
                                                        }
                                                    }
                                                ] 
                                            },
                                            {
                                                $and: [
                                                    {
                                                        from: {
                                                            $gte: start
                                                        }
                                                    },
                                                    {
                                                        from: {
                                                            $lte: end
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }, function(err, resp) {
                                        // Handle Database Connection Failures
                                        if (err) {
                                            res.send({
                                                status: 500,
                                                message: "The system could not contact the server. Please try again later."
                                            });
                                            return;
                                        } 
                                        // Convert Cursor to Array
                                        resp.toArray().then(function(events) {
                                            // Prepare Lists of Errors/Notices and Other Useful Values
                                            var errors = {
                                                critical: [],
                                                warning: [],
                                                concern: [],
                                                information: []
                                            },
                                                days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                                                cost = 0;
                                            // Loop Through Shifts
                                            for (var shift of req.body.shifts) {
                                                // Define Useful Data for Iteration
                                                var index = team.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber),
                                                    s = new Date(shift.start),
                                                    e = new Date(shift.end),
                                                    length = ((e.getTime() - s.getTime()) / 3600000) - (parseInt(shift.breaks) / 60),
                                                    date = ("0" + s.getDate()).slice(-2) + "/" + ("0" + (s.getMonth() + 1)).slice(-2) + "/" + s.getFullYear();
                                                // Create Key to Hold Hours Assigned
                                                if (!team[index].assigned) {
                                                    team[index].assigned = 0;
                                                }
                                                // Count Hours Assigned to User
                                                team[index].assigned += length;
                                                // Check Breaks are Valid for Shift
                                                if ((length >= 6 && shift.breaks < 30) || (length >= 8 && shift.breaks < 60)) {
                                                    errors.warning.push("Insufficient breaks assigned to " + team[index].firstName + " " + team[index].lastName +  " on " + date + ".");
                                                }
                                                // Check if Night Shift Assigned to Under-18
                                                if ((s.getUTCHours() < 6 || (e.getUTCHours() > 21 && e.getUTCMinutes() > 0)) && (Date.now() - new Date(team[index].dob).getTime() < 568025136000)) {
                                                    errors.critical.push("Illegal shift assigned to " + team[index].firstName + " " + team[index].lastName +  " on " + date + ".");
                                                }
                                                // Check Availability Matrix has been Followed for User
                                                if ((s.getUTCDay() > 0 && s.getUTCHours() < 12 && team[index].availability[days[s.getUTCDay()]].morning === false) || (s.getUTCDay() === 0 && s.getUTCHours() < 13 && team[index].availability.sun.morning === false) || (s.getUTCDay() > 0 && s.getUTCHours() < 17 && s.getUTCHours() > 11 && team[index].availability[days[s.getUTCDay()]].afternoon === false) || (s.getUTCDay() > 0 && e.getUTCHours() < 17 && e.getUTCHours() > 12 && e.getUTCMinutes() > 0 && team[index].availability[days[s.getUTCDay()]].afternoon === false) || (s.getUTCDay() === 0 && e.getUTCHours() > 12 && team[index].availability.sun.afternoon === false) || (s.getUTCDay() > 0 && s.getUTCDay() < 6 && e.getUTCHours() > 16 && e.getUTCMinutes() > 0 && team[index].availability[days[s.getUTCDay()]].evening === false) || (s.getUTCDay() === 6 && e.getUTCHours() > 15 && team[index].availability[days[s.getUTCDay()]].evening === false)) {
                                                    errors.warning.push("Availability matrix ignored for " + team[index].firstName + " " + team[index].lastName +  " on " + date + ".");
                                                }
                                                // Check if Day is Bank Holiday
                                                if (week[days[s.getUTCDay()]].bankHoliday === true) {
                                                    // Count Staff Cost (Premium Rate)
                                                    cost += length * team[index].pay * 1.5;
                                                }
                                                else {
                                                    // Count Staff Cost (Standard Rate)
                                                    cost += length * team[index].pay;
                                                }
                                            }
                                            // Loop Through Staff Members
                                            for (var user of team) {
                                                // Create Key to Hold Hours Assigned
                                                if (!user.assigned) {
                                                    user.assigned = 0;
                                                }
                                                // Check if Staff Member's Overtime Limit Exceeded
                                                if (user.assigned > user.hours + user.maxOvertime) {
                                                    errors.warning.push("Too much overtime assigned to " + user.firstName + " " + user.lastName +  ".");
                                                }
                                                // Check if Overtime has Been Assigned
                                                if (user.assigned > user.hours) {
                                                    errors.information.push((user.assigned - user.hours) + " hours of overtime assigned to " + user.firstName + " " + user.lastName +  ".");
                                                }
                                                // Check if User has Too Few Hours
                                                if (user.assigned < user.hours) {
                                                    var done = false;
                                                    // Loop Through Events
                                                    for (var event of events) {
                                                        // Check for Event to Justify Too Few Hours
                                                        if ((event.type == "suspension" || event.type == "maternity" || event.type == "paternity" || event.type == "sickness" || event.type == "elsewhere") && event.staffNumber == user.staffNumber) {
                                                            // Show Justification Found
                                                            done = true;
                                                            // Count Staff Cost
                                                            cost += ((user.hours - user.assigned) * user.pay);
                                                            break;
                                                        }
                                                        // Check for Annual Leave Usage to Justify Too Few Hours
                                                        if (event.type == "leave" && (event.status == "approved" || event.status == "fixed") && event.staffNumber == user.staffNumber) {
                                                            // Show Justification Found
                                                            done = true;
                                                            // Count Staff Cost
                                                            cost += ((user.hours - user.assigned) * user.pay);
                                                            errors.information.push((user.hours - user.assigned) + " hours of annual leave used by " + user.firstName + " " + user.lastName +  ".");
                                                            break;
                                                        }
                                                    }
                                                    // Check if Justification Found
                                                    if (!done) {
                                                        errors.warning.push((user.hours - user.assigned) + " too few hours assigned to " + user.firstName + " " + user.lastName +  ".");
                                                    }       
                                                }
                                            }
                                            // Loop Though Days of Week
                                            for (var day of days) {
                                                // Check if Store Closed
                                                if (week[day].closed === false) {
                                                    // Define Useful Data for This Iteration
                                                    var i = week[day].openCustomers.getTime(),
                                                        j = 0,
                                                        t = "",
                                                        fulldays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                                    // Loop Through 15 Minute Intervals of Day
                                                    while (i <= week[day].closedCustomers.getTime()) {
                                                        // Define Useful Data for This Iteration
                                                        var d = new Date(i),
                                                            time = ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + (d.getUTCMinutes())).slice(-2),
                                                            n = 0;
                                                        // Loop Through Shifts 
                                                        for (var shift of req.body.shifts) {
                                                            // Check if Shift is on Correct Day
                                                            if (new Date(shift.start).getUTCDay() === days.indexOf(day)) {
                                                                // Convert Shift Start & End to Timestamps
                                                                var s = new Date(shift.start),
                                                                    e = new Date(shift.end);
                                                                s.setUTCFullYear(1970, 0, 1);
                                                                e.setUTCFullYear(1970, 0, 1);
                                                                // Check if Shift is a Night Shift
                                                                if (e.getTime() < s.getTime()) {
                                                                    e.setUTCDate(2);
                                                                }    
                                                                // Check if Shift is Within 15 Minute Interval
                                                                if (s.getTime() <= d.getTime() && e.getTime() >= d.getTime()) {
                                                                    // Increment Available Staff by 1
                                                                    n += 1;
                                                                }
                                                            }
                                                        }
                                                        // Check How Many Staff Available in Total for Interval
                                                        if (n === 0 && d.getTime() !== week[day].closedCustomers.getTime()) {
                                                            errors.critical.push("No staff available on " + fulldays[days.indexOf(day)] + " at " + time + ".");
                                                        }
                                                        else if (n === 1) {
                                                            errors.warning.push("Only one member of staff available on " + fulldays[days.indexOf(day)] + " at " + time + ".");
                                                        }
                                                        else if (n === 2) {
                                                            // Track 3 Hours Where Only Two Staff Members are Available
                                                            if (j === 10800000) {
                                                                t = time;
                                                            }
                                                            j += 900000;
                                                        }
                                                        else {
                                                            if (t) {
                                                                errors.concern.push("Only two members of staff available for over three hours on " + fulldays[days.indexOf(day)] + " from " + t + " to " + time + ".");
                                                                t = "";
                                                            }
                                                            j = 0;
                                                        }
                                                        i += 900000;
                                                    }
                                                    if (t) {
                                                        errors.concern.push("Only two members of staff available on " + fulldays[days.indexOf(day)] + " from " + t + " to " + time + ".");
                                                        t = "";
                                                    }
                                                    // Define Data about Opening/Closing Times
                                                    var beforeOpen = week[day].openCustomers.getTime() - 900000,
                                                        afterClose = week[day].closedCustomers.getTime() + 900000,
                                                        staffOpen = week[day].openStaff.getTime(),
                                                        staffClose = week[day].closedStaff.getTime(),
                                                        before = false,
                                                        after = false;
                                                    // Loop Through Shifts
                                                    for (var shift of req.body.shifts) {
                                                        // Check if Shift is on Correct Day
                                                        if (new Date(shift.start).getUTCDay() === days.indexOf(day)) {
                                                            // Convert Shift Start & End to Timestamps
                                                            var s = new Date(shift.start),
                                                                e = new Date(shift.end);
                                                            s.setUTCFullYear(1970, 0, 1);
                                                            e.setUTCFullYear(1970, 0, 1);
                                                            // Check if Shift is a Night Shift  
                                                            if (e.getTime() < s.getTime()) {
                                                                e.setUTCDate(2);
                                                            }  
                                                            // Check if Shift Starts Before Open Hours
                                                            if (s.getTime() <= beforeOpen) {
                                                                before = true;
                                                            }
                                                            // Check if Shift Ends After Open Hours
                                                            if (e.getTime() >= afterClose) {
                                                                after = true;
                                                            }
                                                            // Get User Data from Team Data
                                                            var user = team[team.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber)];
                                                            // Check if Shift Starts Before Unlock
                                                            if (s.getTime() < staffOpen) {
                                                                errors.critical.push("Shift assigned to " + user.firstName + " " + user.lastName + " on " + fulldays[days.indexOf(day)] + " starts before store opened.");
                                                            }
                                                            // Check if Shift Ends After Lockup
                                                            if (e > staffClose) {
                                                                errors.critical.push("Shift assigned to " + user.firstName + " " + user.lastName + " on " + fulldays[days.indexOf(day)] + " ends after store closed.");
                                                            }
                                                        }
                                                    }
                                                    // Check if Staff Available Before Opening
                                                    if (before === false) {
                                                        errors.concern.push("No staff available before opening hours on " + fulldays[days.indexOf(day)] +  ".");
                                                    }
                                                    // Check if Staff Available After Closing
                                                    if (after === false) {
                                                        errors.concern.push("No staff available after opening hours on " + fulldays[days.indexOf(day)] +  ".");
                                                    }
                                                }
                                            }
                                            // Calculate Total Staff Costs
                                            errors.information.push("Total staff costs of the rota are £" + cost.toFixed(2));
                                            // Send Data
                                            res.send({
                                                status: 200,
                                                errors: errors
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    }
                    else {
                        // Send Error
                        res.send({
                            status: 400,
                            message: "Invalid Parameters Sent"
                        });
                    }
                }
                else {
                    // Send Error
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Save Rota Requests
app.post("/rota/save/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.body.weekNumber && req.body.year && req.body.shifts) {
            // Get User's Data from Database
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Check if User is a Manager
                if (resp.manager === true) {
                    // Convert Parameters to Integers
                    req.body.weekNumber = parseInt(req.body.weekNumber);
                    req.body.year = parseInt(req.body.year);
                    // Check Request Parameters are Valid
                    if (!isNaN(req.body.weekNumber) && !isNaN(req.body.year)) {
                        // Loop Through Shifts
                        for (shift of req.body.shifts) {
                            // Convert Parameter Data Types
                            shift.start = new Date(shift.start).getTime();
                            shift.end = new Date(shift.end).getTime();
                            shift.breaks = parseInt(shift.breaks);
                            shift.provisional = (shift.provisional == "true");
                            shift.weekNumber = parseInt(req.body.weekNumber);
                            shift.year = parseInt(req.body.year);
                            // Check Request Parameters are Valid
                            if (isNaN(shift.start) || isNaN(shift.end) || isNaN(shift.breaks)) {
                                // Send Error
                                res.send({
                                    status: 400,
                                    message: "Invalid Parameters Sent"
                                });
                                // End Function
                                break;
                            }
                        }
                        // Delete All Existing Shift Data from Database
                        req.db.collection("shifts").deleteMany({
                            weekNumber: req.body.weekNumber,
                            year: req.body.year
                        }, function(err, done) {
                            // Add New Shift Data to Database
                            req.db.collection("shifts").insertMany(req.body.shifts, function(err, done) {
                                // Handle Database Connection Failures
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                // Check if Shift Should be Published
                                if (req.body.publish == "true") {
                                    // Define Start and End Timestamps of Week
                                    var start = new Date(1547942400000 + (parseInt(req.body.weekNumber * 604800000))).getTime() + ((parseInt(req.body.year) - 2019) * 31536000000),
                                        end = new Date(1547942400000 + (parseInt(req.body.weekNumber * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.body.year) - 2019) * 31536000000);
                                    // Get Week's Event Data from Database
                                    req.db.collection("events").find({
                                        team: resp.team,
                                        $or: [
                                            { $and: [
                                                    {
                                                        from: {
                                                            $lte: start
                                                        }
                                                    },
                                                    {
                                                        to: {
                                                            $gte: start
                                                        }
                                                    }
                                                ] 
                                            },
                                            {
                                                $and: [
                                                    {
                                                        from: {
                                                            $gte: start
                                                        }
                                                    },
                                                    {
                                                        from: {
                                                            $lte: end
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }, function(err, resp) {
                                        // Handle Database Connection Failures
                                        if (err) {
                                            res.send({
                                                status: 500,
                                                message: "The system could not contact the server. Please try again later."
                                            });
                                            return;
                                        }
                                        // Convert Cursor to Array
                                        resp.toArray().then(function(events) {
                                            // Prepare Array of Users
                                            var users = [];
                                            // Loop Through Shifts
                                            for (var shift of req.body.shifts) {
                                                // Determine if Shift's Staff Number is in User Array
                                                if (users.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber) === -1) {
                                                    // Add Shift's Staff Number to User Array
                                                    users.push({
                                                        staffNumber: shift.staffNumber
                                                    });
                                                }
                                            }
                                            // Loop Through Events
                                            for (var event of events) {
                                                // Determine if Event's Staff Number is in User Array
                                                if (users.map(function(x) { return x.staffNumber; }).indexOf(event.staffNumber) === -1) {
                                                    // Add Event's Staff Number to User Array
                                                    users.push({
                                                        staffNumber: event.staffNumber
                                                    });
                                                }
                                            }
                                            // Get Data for All Users in User Array from Database
                                            req.db.collection("users").find({
                                                $or: users
                                            }, function(err, resp) {
                                                // Handle Database Connection Failures
                                                if (err) {
                                                    res.send({
                                                        status: 500,
                                                        message: "The system could not contact the server. Please try again later."
                                                    });
                                                    return;
                                                } 
                                                // Convert Cursor to Array
                                                resp.toArray().then(function(users) {
                                                    // Get Week Data from Database
                                                    req.db.collection("weeks").findOne({
                                                        weekNumber: req.body.weekNumber,
                                                        year: req.body.year
                                                    }, function(err, week) {
                                                        // Define Week Object Keys as Array
                                                        var days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                                                        // Handle Database Connection Failures
                                                        if (err) {
                                                            res.send({
                                                                status: 500,
                                                                message: "The system could not contact the server. Please try again later."
                                                            });
                                                            return;
                                                        } 
                                                        // Loop Through Users
                                                        users.forEach(function(user) {
                                                            // Define Counters/Arrays for Iteration
                                                            var shifts = [],
                                                                standard = 0,
                                                                premium = 0,
                                                                notices = [];
                                                            // Loop Through Shifts
                                                            for (var shift of req.body.shifts) {
                                                                // Check if Shift Belongs to User
                                                                if (shift.staffNumber == user.staffNumber) {
                                                                    // Define Useful Data for Iteration
                                                                    var d = new Date(shift.start),
                                                                        length = ((new Date(shift.end).getTime() - d.getTime()) / 3600000) - (parseInt(shift.breaks)) / 60;
                                                                    // Check if Shift is on a Bank Holiday
                                                                    if (week[days[d.getUTCDay()]].bankHoliday === true) {
                                                                        // Add to Premium Pay
                                                                        premium += length;
                                                                        // Add Notice to List
                                                                        notices.push("You will be paid 1.5x on " + ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear());
                                                                    }
                                                                    else {
                                                                        // Loop Through 15 Minute Intervals
                                                                        for (var i = 0; i < length; i += 0.25) {
                                                                            // Determine if Standard Pay Limit Reached
                                                                            if (standard === 39) {
                                                                                // Add to Premium Pay
                                                                                premium += 0.25;
                                                                            }
                                                                            else {
                                                                                // Add to Standard Pay
                                                                                standard += 0.25;
                                                                            }
                                                                        }
                                                                    }
                                                                    // Add Shift to List
                                                                    shifts.push(shift);
                                                                }
                                                            }
                                                            // Loop Through Events
                                                            for (var event of events) {
                                                                // Check if Event Belongs to User
                                                                if (event.staffNumber == user.staffNumber) {
                                                                    // Check if Event is Annual Leave
                                                                    if (event.type == "leave" && (event.status == "approved" || event.status == "fixed")) {
                                                                        // Work Out Annual Leave Usage
                                                                        var difference = user.hours - (standard + premium);
                                                                        // Add to Standard Pay
                                                                        standard += difference;
                                                                        // Add Notice to List
                                                                        notices.push("You will use " + difference + " hours of annual leave in this week.");
                                                                    }
                                                                }
                                                            }
                                                            // Calculate Pay
                                                            var pay = (user.pay * standard) + (user.pay * premium * 1.5);
                                                            // Add Notice to List
                                                            notices.push("You will be paid £" + pay.toFixed(2) + " in this week.");
                                                            // Check if Email Required
                                                            if (shifts[0] || notices.length > 1) {
                                                                // Check if Emails are Enabled
                                                                if (config.app.emails === true) {
                                                                    // Send Email to User
                                                                    sendmail({
                                                                        from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                                                        to: user.email,
                                                                        subject: "Your shifts for Week " + req.body.weekNumber + " have been published.",
                                                                        html: nunjucksEnv.render("./emails/published.html", { weekNumber: req.body.weekNumber, firstName: user.firstName, shifts: shifts, notices: notices })
                                                                    });
                                                                }
                                                            }
                                                        });
                                                    });
                                                 });
                                            });
                                        });
                                    });
                                    // Update Published Status in Database
                                    req.db.collection("weeks").updateOne({
                                        weekNumber: req.body.weekNumber,
                                        year: req.body.year
                                    }, {
                                        $set: {
                                            published: true
                                        }
                                    });
                                }
                                // Send Success Response
                                res.send({
                                    status: 200,
                                    message: "Rota Saved Successfully"
                                });
                            });
                        });
                    }
                    else {
                        // Send Error
                        res.send({
                            status: 400,
                            message: "Invalid Parameters Sent"
                        });
                    }
                }
                else {
                    // Send Error
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Week Save Requests
app.post("/week/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.body.weekNumber && req.body.year) {
            // Get User's Data from Database
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Check if User is a Manager
                if (resp.manager === true) {
                    // Convert Parameters to Integers
                    req.body.weekNumber = parseInt(req.body.weekNumber);
                    req.body.year = parseInt(req.body.year);
                    // Check Request Parameters are Valid
                    var invalid = false;
                    if (!isNaN(req.body.weekNumber) && !isNaN(req.body.year) && req.body.sun && req.body.mon && req.body.tue && req.body.wed && req.body.thu && req.body.fri && req.body.sat) {
                        for (var key of Object.keys(req.body)) {
                            // Ignore Week Number and Year Keys in Object
                            if (key == "weekNumber" || key == "year") {
                                continue;
                            }
                            // Check Request Parameters are Valid
                            if (!req.body[key].openCustomers || !req.body[key].closedCustomers || !req.body[key].openStaff || !req.body[key].closedStaff) {
                                invalid = true;
                            }
                            else {
                                // Convert Parameter Data Types
                                req.body[key].closed = (req.body[key].closed == "true");
                                req.body[key].bankHoliday = (req.body[key].bankHoliday == "true");
                                req.body[key].openCustomers = new Date(Date.UTC(1970, 0, 1, parseInt(req.body[key].openCustomers.split(":")[0]), parseInt(req.body[key].openCustomers.split(":")[1])));
                                req.body[key].closedCustomers = new Date(Date.UTC(1970, 0, 1, parseInt(req.body[key].closedCustomers.split(":")[0]), parseInt(req.body[key].closedCustomers.split(":")[1])));
                                req.body[key].openStaff = new Date(Date.UTC(1970, 0, 1, parseInt(req.body[key].openStaff.split(":")[0]), parseInt(req.body[key].openStaff.split(":")[1])));
                                req.body[key].closedStaff = new Date(Date.UTC(1970, 0, 1, parseInt(req.body[key].closedStaff.split(":")[0]), parseInt(req.body[key].closedStaff.split(":")[1])));
                                // Check if Times Run Overnight
                                if (req.body[key].closedCustomers < req.body[key].openCustomers) {
                                    req.body[key].closedCustomers.setUTCDate(2);
                                }
                                if (req.body[key].closedStaff < req.body[key].openStaff) {
                                    req.body[key].closedStaff.setUTCDate(2);
                                }
                                // Check for Valid Timestamps
                                if (isNaN(req.body[key].openCustomers.getTime()) || isNaN(req.body[key].closedCustomers.getTime()) || isNaN(req.body[key].openStaff.getTime()) || isNaN(req.body[key].closedStaff.getTime())) {
                                    invalid = true;
                                }
                            }
                        }
                        // Check Object is Valid
                        if (invalid === false) {
                            // Update Week Data in Database
                            req.db.collection("weeks").updateOne({
                                weekNumber: req.body.weekNumber,
                                year: req.body.year
                            }, {
                                $set: req.body
                            }, function(err, done) {
                                // Handle Database Connection Failures
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                // Send Success Response
                                res.send({
                                    status: 200,
                                    message: "Week Settings Saved Successfully"
                                });
                            });
                        }
                        else {
                            // Send Error
                            res.send({
                                status: 400,
                                message: "Invalid Parameters Sent"
                            });
                        }
                    }
                    else {
                        // Send Error
                        res.send({
                            status: 400,
                            message: "Invalid Parameters Sent"
                        });
                    }
                }
                else {
                    // Send Error
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Leave Request Changes
app.post("/requests/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get User's Data from Database
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Check if User is a Manager
            if (resp.manager === true) {
                // Convert Parameters to Integers
                req.body.from = parseInt(req.body.from);
                req.body.to = parseInt(req.body.to);
                // Check Request Parameters are Valid
                if (req.body.staffNumber && req.body.from && !isNaN(req.body.from) && req.body.to && !isNaN(req.body.to) && (req.body.action == "approved" || req.body.action == "rejected")) {
                    // Update Event Data in Database
                    req.db.collection("events").updateOne({
                        staffNumber: req.body.staffNumber,
                        from: req.body.from,
                        to: req.body.to
                    }, {
                        $set: {
                            manager_comment: req.body.comment,
                            status: req.body.action
                        }
                    }, function(err, done) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Get Staff Member's Data from Database
                        req.db.collection("users").findOne({
                            staffNumber: req.body.staffNumber
                        }, function(err, user) {
                            // Handle Database Connection Failures
                            if (err) {
                                res.send({
                                    status: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            // Check if User Object has Email Address
                            if (user && user.email) {
                                // Check if Emails are Enabled
                                if (config.app.emails === true) {
                                    // Send Email to User
                                    sendmail({
                                        from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                        to: user.email,
                                        subject: "Your annual leave request has been " + req.body.action + ".",
                                        html: nunjucksEnv.render("./emails/request.html", { firstName: user.firstName, action: req.body.action, from: req.body.from, to: req.body.to, comment: req.body.comment })
                                    });
                                }
                            }
                            // Send Success Response
                            res.send({
                                status: 200,
                                message: "Request Updated Successfully"
                            });
                        });
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 400,
                        message: "Missing Fields"
                    });
                }
            }
            else {
                // Send Error
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept New Additional Events
app.post("/event/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get User's Data from Database
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Check if User is a Manager
            if (resp.manager === true) {
                // Convert Parameters to Timestamps
                req.body.from = new Date(req.body.from).getTime();
                req.body.to = new Date(req.body.to).getTime();
                // Add Team ID to Body Object
                req.body.team = resp.team;
                // Check Request Parameters are Valid
                if (req.body.staffNumber && req.body.fullName && req.body.type && req.body.from && !isNaN(req.body.from) && req.body.to && !isNaN(req.body.to) && req.body.from <= req.body.to) {
                    // Add Additional Parameters for Fixed Annual Leave
                    if (req.body.type == "leave") {
                        req.body.status = "fixed";
                        req.body.manager_comment = null;
                        req.body.user_comment = null;
                    }
                    // Get Staff Member's Data from Database
                    req.db.collection("users").findOne({
                        staffNumber: req.body.staffNumber
                    }, function(err, user) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Check if Request is an Update
                        if (req.body.initial) {
                            // Convert Parameters to Integers
                            req.body.initial.from = parseInt(req.body.initial.from);
                            req.body.initial.to = parseInt(req.body.initial.to);
                            // Update Event Data in Database
                            req.db.collection("events").updateOne(req.body.initial, {
                                $set: {
                                    staffNumber: req.body.staffNumber,
                                    fullName: req.body.fullName,
                                    type: req.body.type,
                                    from: req.body.from,
                                    to: req.body.to
                                }
                            }, function(err, done) {
                                // Handle Database Connection Failures
                                if (err) {  
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                // Check if User Object has Email Address
                                if (user && user.email) {
                                    // Check if Emails are Enabled
                                    if (config.app.emails === true) {
                                        // Send Email to User
                                        sendmail({
                                            from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                            to: user.email,
                                            subject: "A new " + req.body.type +  " event has been created for you.",
                                            html: nunjucksEnv.render("./emails/event.html", { firstName: user.firstName, type: req.body.type, from: req.body.from, to: req.body.to, status: "created" })
                                        });
                                    }
                                }
                                // Get Old User's Data from Database
                                req.db.collection("users").findOne({
                                    staffNumber: req.body.initial.staffNumber
                                }, function(err, user) {
                                    // Handle Database Connection Failures
                                    if (err) {
                                        res.send({
                                            status: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    }
                                    // Check if User Object has Email Address
                                    if (user && user.email) {
                                        // Check if Emails are Enabled
                                        if (config.app.emails === true) {
                                            // Send Email to User
                                            sendmail({
                                                from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                                to: user.email,
                                                subject: "Your " + req.body.type +  " event has been deleted.",
                                                html: nunjucksEnv.render("./emails/event.html", { firstName: user.firstName, type: req.body.type, from: req.body.from, to: req.body.to, status: "deleted" })
                                            });
                                        }
                                    }
                                });
                                // Send Success Response
                                res.send({
                                    status: 200,
                                    message: "Event Updated Successfully"
                                });
                            });
                        }
                        else {
                            // Destroy Unrequired Parameters
                            delete req.body.initial;
                            // Add Event Data to Database
                            req.db.collection("events").insertOne(req.body, function(err, done) {
                                // Handle Database Connection Failures
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                // Check if User Object has Email Address
                                if (user && user.email) {
                                    // Check if Emails are Enabled
                                    if (config.app.emails === true) {
                                        // Send Email to User
                                        sendmail({
                                            from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                            to: user.email,
                                            subject: "A new " + req.body.type +  " event has been created for you.",
                                            html: nunjucksEnv.render("./emails/event.html", { firstName: user.firstName, type: req.body.type, from: req.body.from, to: req.body.to, status: "created" })
                                        });
                                    }
                                }
                                // Send Success Response 
                                res.send({
                                    status: 200,
                                    message: "Event Added Successfully"
                                });
                            });
                        }
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 400,
                        message: "Missing Fields"
                    });
                }
            }
            else {
                // Send Error
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Logout Requests
app.post("/logout/", function(req, res) {
    // Destroy Session Data
    req.session.destroy();
    // Send Success Response
    res.sendStatus(200);
});

// Accept User Deletion Requests
app.delete("/staff/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get User's Data from Database
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Check if User is a Manager
            if (resp.manager === true) {
                // Delete Staff Member Data from Database
                req.db.collection("users").deleteOne({
                    staffNumber: req.body.staffNumber
                }, function(err, done) {
                    // Handle Database Connection Failures
                    if (err) {
                        res.send({
                            status: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    // Send Success Response
                    res.send({
                        status: 200,
                        message: "User Deleted Successfully"
                    });
                });
            }
            else {
                // Send Error
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Additional Event Deletion Requests
app.delete("/event/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get User's Data from Database
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Check User is a Manager
            if (resp.manager === true) {
                // Convert Parameters to Timestamps
                req.body.from = new Date(req.body.from).getTime();
                req.body.to = new Date(req.body.to).getTime();
                // Check Request Parameters are Valid
                if (req.body && req.body.staffNumber && req.body.type && req.body.from && !isNaN(parseInt(req.body.from)) && req.body.to && !isNaN(parseInt(req.body.to))) {
                    // Delete Event Data from Database
                    req.db.collection("events").deleteOne({
                        staffNumber: req.body.staffNumber,
                        type: req.body.type,
                        from: req.body.from,
                        to: req.body.to
                    }, function(err, done) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Get Event's Staff Member's Data from Database
                        req.db.collection("users").findOne({
                            staffNumber: req.body.staffNumber
                        }, function(err, user) {
                            // Handle Database Connection Failures
                            if (err) {
                                res.send({
                                    status: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            }
                            // Check if User Object has Email Address
                            if (user && user.email) {
                                // Check if Emails are Enabled
                                if (config.app.emails === true) {
                                    // Send Email to User
                                    sendmail({
                                        from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                        to: user.email,
                                        subject: "Your " + req.body.type +  " event has been deleted.",
                                        html: nunjucksEnv.render("./emails/event.html", { firstName: user.firstName, type: req.body.type, from: req.body.from, to: req.body.to, status: "deleted" })
                                    });
                                }
                            }
                            // Send Success Response
                            res.send({
                                status: 200,
                                message: "Event Deleted Successfully"
                            });
                        });
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 400,
                        message: "Missing Fields"
                    });
                }
            }
            else {
                // Send Error
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Run Server
var server = app.listen(config.app.port, function() {
    // Send Startup Message to Console
    console.log("RotaIt Management Running - Port " + config.app.port);
});