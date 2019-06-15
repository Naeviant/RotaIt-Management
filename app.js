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
app.use(mongodb("mongodb://localhost/rotait"));

// App Local Variables
app.locals = {
    version: package.version
}

// Session Local Variables
app.get("*", function(req, res, next) {
    res.locals = req.session;
    next();
});

// Get Main Page
app.get("/", function(req, res) {
    res.render("template");
});

// Get Partial - Team
app.get("/partial/staff/", function(req, res) {
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            req.db.collection("users").find({
                team: resp.team
            }, {
                sort: [["firstName", "ascending"]]
            }, function(err, resp) {
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                resp.toArray().then(function(team) {
                    res.render("partials/staff", {
                        team: team
                    });
                });
            });
        });
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Manage Staff
app.get("/partial/staff_manage/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query && req.query.staffNumber) {
            req.db.collection("users").findOne({
                staffNumber: req.query.staffNumber
            }, function(err, resp) {
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                if (resp) {
                    resp.dob = resp.dob.getFullYear() + "-" + ("0" + (resp.dob.getMonth() + 1)).slice(-2) + "-" + ("0" + resp.dob.getDate()).slice(-2);
                    res.render("partials/staff_manage", { edit: true, user: resp });
                }
                else {
                    res.render("partials/error", {
                        code: 400,
                        message: "An unknown error occurred. Please try again later."
                    });
                }
            });
        }
        else {
            res.render("partials/staff_manage");
        }
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Rota Search
app.get("/partial/rota/", function(req, res) {
    if (req.session.loggedin) {
        res.render("partials/rota_search");
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Rota Manage
app.get("/partial/rota_manage/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query.week && req.query.year && !isNaN(parseInt(req.query.week)) && !isNaN(parseInt(req.query.year))) {
            req.query.week = parseInt(req.query.week);
            req.query.year = parseInt(req.query.year);
            if (req.query.year >= 2000 && req.query.week >= 1 && req.query.week <= 52) {
                req.db.collection("users").findOne({
                    staffNumber: req.session.loggedin
                }, function(err, resp) {
                    if (err) {
                        res.render("partials/error", {
                            code: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    var limit = new Date(1547942400000 + (parseInt((req.query.week + 1) * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
                    if (limit < Date.now()) {
                        req.db.collection("weeks").findOne({
                            weekNumber: req.query.week,
                            year: req.query.year
                        }, function(err, week) {
                            if (err) {
                                res.render("partials/error", {
                                    code: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            if (week && week.published === true) {
                                var users = [];
                                req.db.collection("shifts").find({
                                    weekNumber: req.query.week,
                                    year: req.query.year
                                }, function(err, resp) {
                                    if (err) {
                                        res.render("partials/error", {
                                            code: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    } 
                                    resp.toArray().then(function(shifts) {
                                        var start = new Date(1547942400000 + (parseInt(req.query.week * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000),
                                            end = new Date(1547942400000 + (parseInt(req.query.week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
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
                                            if (err) {
                                                res.render("partials/error", {
                                                    code: 500,
                                                    message: "The system could not contact the server. Please try again later."
                                                });
                                                return;
                                            } 
                                            resp.toArray().then(function(events) {
                                                for (var shift of shifts) {
                                                    if (users.map(function(x) { return x.staffNumber }).indexOf(shift.staffNumber) === -1) {
                                                        users.push({
                                                            firstName: shift.fullName.split(" ")[0],
                                                            lastName: shift.fullName.split(" ")[1],
                                                            staffNumber: shift.staffNumber
                                                        });
                                                    }
                                                }
                                                for (var event of events) {
                                                    if (users.map(function(x) { return x.staffNumber }).indexOf(event.staffNumber) === -1) {
                                                        users.push({
                                                            firstName: event.fullName.split(" ")[0],
                                                            lastName: event.fullName.split(" ")[1],
                                                            staffNumber: event.staffNumber
                                                        });
                                                    }
                                                }
                                                users.sort(function(a, b) {
                                                    if (a.firstName < b.firstName) {
                                                        return -1;
                                                    }
                                                    if (a.firstName > b.firstName) {
                                                        return 1;
                                                    }
                                                    return 0;
                                                });
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
                                res.render("partials/error", {
                                    code: 400,
                                    message: "No rota was published for this week."
                                });
                            }
                        });
                    }
                    else {
                        req.db.collection("users").find({
                            team: resp.team
                        }, {
                            sort: [["firstName", "ascending"]]
                        }, function(err, resp) {
                            if (err) {
                                res.render("partials/error", {
                                    code: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            resp.toArray().then(function(team) {
                                req.db.collection("weeks").findOne({
                                    weekNumber: req.query.week,
                                    year: req.query.year
                                }, function(err, week) {
                                    if (err) {
                                        res.render("partials/error", {
                                            code: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    } 
                                    if (!week) {
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
                                        }
                                    }
                                    res.render("partials/rota_manage", {
                                        team: team,
                                        week: week,
                                        past: false
                                    });
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
                res.render("partials/error", {
                    code: 400,
                    message: "The week number or year was invalid."
                });
            }
        }
        else {
            res.render("partials/error", {
                code: 400,
                message: "The week number or year was invalid."
            });
        }
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "Authentication with the server failed. Please try again later."
        });
    }
});

// Get Partial - Pending Requests
app.get("/partial/requests/", function(req, res) {
    if (req.session.loggedin) {
        var d = new Date();
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
        req.db.collection("events").find({
                type: "leave",
                status: "pending",
                team: req.session.team
            }, {
                sort: [["from", "ascending"]]
            }, function(err, resp) {
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                resp.toArray().then(function(requests) {
                    res.render("partials/requests", {
                        requests: requests
                    });
                });
            });
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Additional Events
app.get("/partial/events/", function(req, res) {
    if (req.session.loggedin) {
        var d = new Date();
        d.setHours(0);
        d.setMinutes(0);
        d.setSeconds(0);
        d.setMilliseconds(0);
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
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                resp.toArray().then(function(events) {
                    res.render("partials/events", {
                        events: events
                    });
                });
            });
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Additional Event
app.get("/partial/events_manage/", function(req, res) {
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            req.db.collection("users").find({
                team: resp.team
            }, {
                sort: [["firstName", "ascending"]]
            }, function(err, resp) {
                if (err) {
                    res.render("partials/error", {
                        code: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                resp.toArray().then(function(team) {
                    if (req.query && req.query.staffNumber && req.query.type && req.query.from && !isNaN(parseInt(req.query.from)) && req.query.to && !isNaN(parseInt(req.query.to))) {
                        req.query.from = parseInt(req.query.from);
                        req.query.to = parseInt(req.query.to);
                        req.db.collection("events").findOne({
                            staffNumber: req.query.staffNumber,
                            type: req.query.type,
                            from: req.query.from,
                            to: req.query.to
                        }, function(err, resp) {
                            if (err) {
                                res.render("partials/error", {
                                    code: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            resp.from_html = new Date(resp.from);
                            resp.to_html = new Date(resp.to);
                            resp.from_html = resp.from_html.getFullYear() + "-" + ("0" + (resp.from_html.getMonth() + 1)).slice(-2) + "-" + ("0" + resp.from_html.getDate()).slice(-2);
                            resp.to_html = resp.to_html.getFullYear() + "-" + ("0" + (resp.to_html.getMonth() + 1)).slice(-2) + "-" + ("0" + resp.to_html.getDate()).slice(-2);
                            res.render("partials/events_manage", {
                                team: team,
                                edit: true,
                                event: resp
                            });
                        });
                    }
                    else {
                        res.render("partials/events_manage", {
                            team: team
                        });
                    }
                });
            });
        });
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Week Data
app.get("/week/", function(req, res) {
if (req.session.loggedin) {
        if (req.query.week && req.query.year) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                if (resp.manager === true) {
                    req.query.week = parseInt(req.query.week);
                    req.query.year = parseInt(req.query.year);
                    req.db.collection("weeks").findOne({
                        weekNumber: req.query.week,
                        year: req.query.year
                    }, function(err, week) {
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        res.send({
                            status: 200,
                            week: week
                        });
                    });
                }
                else {
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Get Rota Data
app.get("/rota/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query.week && req.query.year) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                if (resp.manager === true) {
                    req.query.week = parseInt(req.query.week);
                    req.query.year = parseInt(req.query.year);
                    req.db.collection("shifts").find({
                        weekNumber: req.query.week,
                        year: req.query.year
                    }, function(err, shifts) {
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        shifts.toArray().then(function(rota) {
                            res.send({
                                status: 200,
                                rota: rota
                            });
                        });
                    });
                }
                else {
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Get Event Data
app.get("/events/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query.week && req.query.year) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                if (resp.manager === true) {
                    var start = new Date(1547942400000 + (parseInt(req.query.week * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000),
                        end = new Date(1547942400000 + (parseInt(req.query.week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
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
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        resp.toArray().then(function(events) {
                            res.send({
                                status: 200,
                                events: events
                            });
                        });
                    });
                }
                else {
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// 

// Get Partial - 404
app.get("/partial/*", function(req, res) {
    res.render("partials/error", {
        code: 404,
        message: "The page you requested was not found."
    });
});

// Accept Login Details
app.post("/login/", function(req, res) {
    req.db.collection("users").findOne({
        staffNumber: req.body.staffNumber,
        password: req.body.password
    }, function(err, resp) {
        if (err) {
            res.send({
                status: 500,
                message: "The system could not contact the server. Please try again later."
            });
            return;
        } 
        if (resp) {
            if (resp.manager === true) {
                req.session.loggedin = resp.staffNumber;
                req.session.team = resp.team;
                req.session.name = resp.firstName + " " + resp.lastName;
                res.send({
                    status: 200,
                    message: "Login Successful"
                });
            }
            else {
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        }
        else {
            res.send({
                status: 404,
                message: "User Account Not Found"
            });
        }
    });
});

// Accept New Users
app.post("/staff/", function(req, res) {
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            if (resp.manager === true) {
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
                if (req.body.firstName && req.body.lastName && !isNaN(req.body.dob.getTime()) && req.body.staffNumber && req.body.jobRole && req.body.email && !isNaN(req.body.hours) && !isNaN(req.body.maxOvertime) && !isNaN(req.body.hours && (!req.body.newUser || req.body.password))) {
                    req.db.collection("users").findOne({
                        staffNumber: req.body.staffNumber
                    }, function(err, exists) {
                        if (exists && !req.body.newUser) {
                            delete req.body.newUser;
                            delete req.body.password;
                            req.db.collection("users").updateOne({
                                staffNumber: req.body.staffNumber
                            }, {
                                $set: req.body
                            }, function(err, done) {
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                sendmail({
                                    from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                    to: req.body.email,
                                    subject: "Your details have been updated.",
                                    html: nunjucksEnv.render("./emails/details.html", { user: req.body, type: "updated" })
                                });
                                res.send({
                                    status: 200,
                                    message: "User Updated Successfully"
                                });
                            });
                        }
                        else if (exists && req.body.newUser) {
                            res.send({
                                status: 400,
                                message: "Staff Number in Use"
                            });
                        }
                        else {
                            delete req.body.newUser;
                            req.db.collection("users").insertOne(req.body, function(err, done) {
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                sendmail({
                                    from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                    to: req.body.email,
                                    subject: "Your details have been set.",
                                    html: nunjucksEnv.render("./emails/details.html", { user: req.body, type: "set" })
                                });
                                res.send({
                                    status: 200,
                                    message: "User Added Successfully"
                                });
                            });
                        }
                    });
                }
                else {
                    res.send({
                        status: 400,
                        message: "Missing Fields"
                    });
                }
            }
            else {
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Password Reset Requests
app.post("/password/", function(req, res) {
    if (req.session.loggedin) {
        if (req.body.password) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                if (resp.manager === true) {
                    req.db.collection("users").updateOne({
                        staffNumber: req.body.staffNumber
                    }, {
                        $set: {
                            password: req.body.password
                        }
                    }, function(err, done) {
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        res.send({
                            status: 200,
                            message: "Password Updated Successfully"
                        });
                    })
                }
                else {
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            res.send({
                status: 400,
                message: "No New Password Given"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Verify Rota Requests
app.post("/rota/verify/", function(req, res) {
    if (req.session.loggedin) {
        if (req.body.weekNumber && req.body.year && req.body.shifts) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                if (resp.manager === true) {
                    req.body.weekNumber = parseInt(req.body.weekNumber);
                    req.body.year = parseInt(req.body.year);
                    if (!isNaN(req.body.weekNumber) && !isNaN(req.body.year)) {
                        req.db.collection("users").find({
                            team: resp.team
                        }, function(err, resp) {
                            if (err) {
                                res.send({
                                    status: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            resp.toArray().then(function(team) {
                                req.db.collection("weeks").findOne({
                                    weekNumber: req.body.weekNumber,
                                    year: req.body.year
                                }, function(err, week) {
                                    if (err) {
                                        res.send({
                                            status: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    } 
                                    var start = new Date(1547942400000 + (parseInt(req.body.weekNumber * 604800000))).getTime() + ((parseInt(req.body.year) - 2019) * 31536000000),
                                        end = new Date(1547942400000 + (parseInt(req.body.weekNumber * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.body.year) - 2019) * 31536000000);
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
                                        if (err) {
                                            res.send({
                                                status: 500,
                                                message: "The system could not contact the server. Please try again later."
                                            });
                                            return;
                                        } 
                                        resp.toArray().then(function(events) {
                                            var errors = {
                                                critical: [],
                                                warning: [],
                                                concern: [],
                                                information: []
                                            },
                                                days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                                                cost = 0;
                                            for (var shift of req.body.shifts) {
                                                var index = team.map(function(x) { return x.staffNumber }).indexOf(shift.staffNumber),
                                                    s = new Date(shift.start),
                                                    e = new Date(shift.end),
                                                    length = ((e.getTime() - s.getTime()) / 3600000) - (parseInt(shift.breaks) / 60),
                                                    date = ("0" + s.getDate()).slice(-2) + "/" + ("0" + (s.getMonth() + 1)).slice(-2) + "/" + s.getFullYear();
                                                if (!team[index].assigned) {
                                                    team[index].assigned = 0;
                                                }
                                                team[index].assigned += length;
                                                if ((length >= 6 && shift.breaks < 30) || (length >= 8 && shift.breaks < 60)) {
                                                    errors.warning.push("Insufficient breaks assigned to " + team[index].firstName + " " + team[index].lastName +  " on " + date + ".");
                                                }
                                                if ((s.getUTCHours() < 6 || (e.getUTCHours() > 21 && e.getUTCMinutes() > 0)) && (Date.now() - new Date(team[index].dob).getTime() < 568025136000)) {
                                                    errors.critical.push("Illegal shift assigned to " + team[index].firstName + " " + team[index].lastName +  " on " + date + ".");
                                                }
                                                if ((s.getUTCDay() > 0 && s.getUTCHours() < 12 && team[index].availability[days[s.getUTCDay()]].morning === false) || (s.getUTCDay() === 0 && s.getUTCHours() < 13 && team[index].availability.sun.morning === false) || (s.getUTCDay() > 0 && s.getUTCHours() < 17 && s.getUTCHours() > 11 && team[index].availability[days[s.getUTCDay()]].afternoon === false) || (s.getUTCDay() > 0 && e.getUTCHours() < 17 && e.getUTCHours() > 12 && e.getUTCMinutes() > 0 && team[index].availability[days[s.getUTCDay()]].afternoon === false) || (s.getUTCDay() === 0 && e.getUTCHours() > 12 && team[index].availability.sun.afternoon === false) || (s.getUTCDay() > 0 && s.getUTCDay() < 6 && e.getUTCHours() > 16 && e.getUTCMinutes() > 0 && team[index].availability[days[s.getUTCDay()]].evening === false) || (s.getUTCDay() === 6 && e.getUTCHours() > 15 && team[index].availability[days[s.getUTCDay()]].evening === false)) {
                                                    errors.warning.push("Availability matrix ignored for " + team[index].firstName + " " + team[index].lastName +  " on " + date + ".");
                                                }
                                                if (week[days[s.getUTCDay()]].bankHoliday === true) {
                                                    cost += length * team[index].pay * 1.5;
                                                }
                                                else {
                                                    cost += length * team[index].pay;
                                                }
                                            }
                                            for (var user of team) {
                                                if (!user.assigned) {
                                                    user.assigned = 0;
                                                }
                                                if (user.assigned > user.hours + user.maxOvertime) {
                                                    errors.warning.push("Too much overtime assigned to " + user.firstName + " " + user.lastName +  ".");
                                                }
                                                if (user.assigned > user.hours) {
                                                    errors.information.push((user.assigned - user.hours) + " hours of overtime assigned to " + user.firstName + " " + user.lastName +  ".");
                                                }
                                                if (user.assigned < user.hours) {
                                                    var done = false;
                                                    for (var event of events) {
                                                        if ((event.type == "suspension" || event.type == "maternity" || event.type == "paternity" || event.type == "sickness" || event.type == "elsewhere") && event.staffNumber == user.staffNumber) {
                                                            done = true;
                                                            cost += ((user.hours - user.assigned) * user.pay);
                                                            break;
                                                        }
                                                        if (event.type == "leave" && event.status == "approved" && event.staffNumber == user.staffNumber) {
                                                            done = true;
                                                            cost += ((user.hours - user.assigned) * user.pay);
                                                            errors.information.push((user.hours - user.assigned) + " hours of annual leave used by " + user.firstName + " " + user.lastName +  ".");
                                                            break;
                                                        }
                                                    }
                                                    if (!done) {
                                                        errors.warning.push((user.hours - user.assigned) + " too few hours assigned to " + user.firstName + " " + user.lastName +  ".");
                                                    }       
                                                }
                                            }
                                            for (var day of days) {
                                                if (week[day].closed === false) {
                                                    var i = week[day].openCustomers.getTime(),
                                                        j = 0,
                                                        t = "",
                                                        fulldays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                                    while (i <= week[day].closedCustomers.getTime()) {
                                                        var d = new Date(i),
                                                            time = ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + (d.getUTCMinutes())).slice(-2)
                                                            n = 0;
                                                        for (var shift of req.body.shifts) {
                                                            if (new Date(shift.start).getUTCDay() === days.indexOf(day)) {
                                                                var s = new Date(1970, 0, 1, new Date(shift.start).getUTCHours(), new Date(shift.start).getUTCMinutes()),
                                                                    e = new Date(1970, 0, 1, new Date(shift.end).getUTCHours(), new Date(shift.end).getUTCMinutes());                    
                                                                if (s.getTime() <= d.getTime() && e.getTime() > d.getTime()) {
                                                                    n += 1;
                                                                }
                                                            }
                                                        }
                                                        if (n === 0 && new Date(1970, 0, 1, d.getUTCHours(), d.getUTCMinutes()).getTime() !== week[day].closedCustomers.getTime()) {
                                                            errors.critical.push("No staff available on " + fulldays[days.indexOf(day)] + " at " + time + ".");
                                                        }
                                                        else if (n === 1) {
                                                            errors.warning.push("Only one member of staff available on " + fulldays[days.indexOf(day)] + " at " + time + ".");
                                                        }
                                                        else if (n === 2) {
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
                                                    var beforeOpen = week[day].openCustomers.getTime() - 900000,
                                                        afterClose = week[day].closedCustomers.getTime() + 900000,
                                                        staffOpen = week[day].openStaff.getTime(),
                                                        staffClose = week[day].closedStaff.getTime(),
                                                        before = false,
                                                        after = false;
                                                    for (var shift of req.body.shifts) {
                                                        if (new Date(shift.start).getUTCDay() === days.indexOf(day)) {
                                                            if (new Date(1970, 0, 1, new Date(shift.start).getUTCHours(), new Date(shift.start).getUTCMinutes()).getTime() <= beforeOpen) {
                                                                before = true;
                                                            }
                                                            if (new Date(1970, 0, 1, new Date(shift.end).getUTCHours(), new Date(shift.end).getUTCMinutes()).getTime() >= afterClose) {
                                                                after = true;
                                                            }
                                                            var user = team[team.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber)];
                                                            if (new Date(1970, 0, 1, new Date(shift.start).getUTCHours(), new Date(shift.start).getUTCMinutes()).getTime() < staffOpen) {
                                                                errors.critical.push("Shift assigned to " + user.firstName + " " + user.lastName + " on " + fulldays[days.indexOf(day)] + " starts before store opened.");
                                                            }
                                                            if (new Date(1970, 0, 1, new Date(shift.end).getUTCHours(), new Date(shift.end).getUTCMinutes()).getTime() > staffClose) {
                                                                errors.critical.push("Shift assigned to " + user.firstName + " " + user.lastName + " on " + fulldays[days.indexOf(day)] + " ends after store closed.");
                                                            }
                                                        }
                                                    }
                                                    if (before === false) {
                                                        errors.concern.push("No staff available before opening hours on " + fulldays[days.indexOf(day)] +  ".");
                                                    }
                                                    if (after === false) {
                                                        errors.concern.push("No staff available after opening hours on " + fulldays[days.indexOf(day)] +  ".");
                                                    }
                                                }
                                            }
                                            errors.information.push("Total staff costs of the rota are £" + cost.toFixed(2));
                                            res.send({
                                                status: 200,
                                                errors: errors
                                            })
                                        });
                                    });
                                });
                            });
                        });
                    }
                    else {
                        res.send({
                            status: 400,
                            message: "Invalid Parameters Sent"
                        });
                    }
                }
                else {
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Save Rota Requests
app.post("/rota/save/", function(req, res) {
    if (req.session.loggedin) {
        if (req.body.weekNumber && req.body.year && req.body.shifts) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                if (resp.manager === true) {
                    req.body.weekNumber = parseInt(req.body.weekNumber);
                    req.body.year = parseInt(req.body.year);
                    if (!isNaN(req.body.weekNumber) && !isNaN(req.body.year)) {
                        for (shift of req.body.shifts) {
                            shift.start = new Date(shift.start).getTime();
                            shift.end = new Date(shift.end).getTime();
                            shift.breaks = parseInt(shift.breaks);
                            shift.provisional = (shift.provisional == "true");
                            shift.weekNumber = parseInt(req.body.weekNumber);
                            shift.year = parseInt(req.body.year);
                            if (isNaN(shift.start) || isNaN(shift.end) || isNaN(shift.breaks)) {
                                res.send({
                                    status: 400,
                                    message: "Invalid Parameters Sent"
                                });
                                break;
                            }
                        }
                        req.db.collection("shifts").deleteMany({
                            weekNumber: req.body.weekNumber,
                            year: req.body.year
                        }, function(err, done) {
                            req.db.collection("shifts").insertMany(req.body.shifts, function(err, done) {
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                if (req.body.publish == "true") {
                                    var start = new Date(1547942400000 + (parseInt(req.body.weekNumber * 604800000))).getTime() + ((parseInt(req.body.year) - 2019) * 31536000000),
                                        end = new Date(1547942400000 + (parseInt(req.body.weekNumber * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.body.year) - 2019) * 31536000000);
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
                                        if (err) {
                                            res.send({
                                                status: 500,
                                                message: "The system could not contact the server. Please try again later."
                                            });
                                            return;
                                        }
                                        resp.toArray().then(function(events) {
                                            var users = [];
                                            for (var shift of req.body.shifts) {
                                                if (users.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber) === -1) {
                                                    users.push({
                                                        staffNumber: shift.staffNumber
                                                    })
                                                }
                                            }
                                            for (var event of events) {
                                                if (users.map(function(x) { return x.staffNumber; }).indexOf(event.staffNumber) === -1) {
                                                    users.push({
                                                        staffNumber: event.staffNumber
                                                    })
                                                }
                                            }
                                            req.db.collection("users").find({
                                                $or: users
                                            }, function(err, resp) {
                                                if (err) {
                                                    res.send({
                                                        status: 500,
                                                        message: "The system could not contact the server. Please try again later."
                                                    });
                                                    return;
                                                } 
                                                resp.toArray().then(function(users) {
                                                    req.db.collection("weeks").findOne({
                                                        weekNumber: req.body.weekNumber,
                                                        year: req.body.year
                                                    }, function(err, week) {
                                                        var days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                                                        if (err) {
                                                            res.send({
                                                                status: 500,
                                                                message: "The system could not contact the server. Please try again later."
                                                            });
                                                            return;
                                                        } 
                                                        users.forEach(function(user) {
                                                            var shifts = [],
                                                                standard = 0,
                                                                premium = 0,
                                                                notices = [];
                                                            for (var shift of req.body.shifts) {
                                                                if (shift.staffNumber == user.staffNumber) {
                                                                    var d = new Date(shift.start),
                                                                        length = ((new Date(shift.end).getTime() - d.getTime()) / 3600000) - (parseInt(shift.breaks)) / 60;
                                                                    if (week[days[d.getUTCDay()]].bankHoliday === true) {
                                                                        premium += length;
                                                                        notices.push("You will be paid 1.5x on " + ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear());
                                                                    }
                                                                    else {
                                                                        for (var i = 0; i < length; i += 0.25) {
                                                                            if (standard === 39) {
                                                                                premium += 0.25;
                                                                            }
                                                                            else {
                                                                                standard += 0.25;
                                                                            }
                                                                        }
                                                                    }
                                                                    shifts.push(shift);
                                                                }
                                                            }
                                                            for (var event of events) {
                                                                if (event.staffNumber == user.staffNumber) {
                                                                    if (event.type == "leave" && event.status == "approved") {
                                                                        var difference = user.hours - (standard + premium);
                                                                        standard += difference;
                                                                        notices.push("You will use " + difference + " hours of annual leave in this week.")
                                                                    }
                                                                }
                                                            }
                                                            var pay = (user.pay * standard) + (user.pay * premium * 1.5);
                                                            notices.push("You will be paid £" + pay.toFixed(2) + " in this week.")
                                                            if (shifts[0] || notices.length > 1) {
                                                                sendmail({
                                                                    from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                                                    to: user.email,
                                                                    subject: "Your shifts for Week " + req.body.weekNumber + " have been published.",
                                                                    html: nunjucksEnv.render("./emails/published.html", { weekNumber: req.body.weekNumber, firstName: user.firstName, shifts: shifts, notices: notices })
                                                                });
                                                            }
                                                        });
                                                    });
                                                 });
                                            });
                                        });
                                    });
                                    req.db.collection("weeks").updateOne({
                                        weekNumber: req.body.weekNumber,
                                        year: req.body.year
                                    }, {
                                        $set: {
                                            published: true
                                        }
                                    });
                                }
                                res.send({
                                    status: 200,
                                    message: "Rota Saved Successfully"
                                });
                            });
                        });
                    }
                    else {
                        res.send({
                            status: 400,
                            message: "Invalid Parameters Sent"
                        });
                    }
                }
                else {
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Rota Export Requests
app.get("/rota/export/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query.from_week && req.query.from_year && req.query.to_week && req.query.to_year) {
            req.query.from_week = parseInt(req.query.from_week);
            req.query.from_year = parseInt(req.query.from_year);
            req.query.to_week = parseInt(req.query.to_week);
            req.query.to_year = parseInt(req.query.to_year);
            if (!isNaN(req.query.from_week) && !isNaN(req.query.from_year) && !isNaN(req.query.to_week) && !isNaN(req.query.to_year) && req.query.from_week >= 1 && req.query.from_week <= 52 && req.query.from_year >= 2019 && req.query.to_week >= 1 && req.query.to_week <= 52 && req.query.to_year >= 2019) {
                var from = req.query.from_week + ((req.query.from_year - 2019) * 52),
                    to = req.query.to_week + ((req.query.to_year - 2019) * 52);
                if (from <= to) {
                    req.db.collection("users").findOne({
                        staffNumber: req.session.loggedin
                    }, function(err, resp) {
                        if (err) {
                            res.render("partials/error", {
                                code: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        var users = [],
                            query = [],
                            i = req.query.from_week,
                            j = req.query.from_year;
                        while (i <= req.query.to_week || j < req.query.to_year) {
                            query.push({
                                weekNumber: i,
                                year: j
                            });
                            i++;
                            if (i > 52) {
                                i = 1;
                                j++;
                            }
                        }
                        req.db.collection("weeks").find({
                            $or: query
                        }, function(err, resp) {
                            resp.toArray().then(function(weeks) {
                                req.db.collection("shifts").find({
                                    $or: query
                                }, function(err, resp) {
                                    if (err) {
                                        res.render("partials/error", {
                                            code: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    } 
                                    resp.toArray().then(function(shifts) {
                                        var start = new Date(1547942400000 + (parseInt(req.query.from_week * 604800000))).getTime() + ((parseInt(req.query.from_year) - 2019) * 31536000000),
                                            end = new Date(1547942400000 + (parseInt(req.query.to_week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.to_year) - 2019) * 31536000000);
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
                                            if (err) {
                                                res.render("partials/error", {
                                                    code: 500,
                                                    message: "The system could not contact the server. Please try again later."
                                                });
                                                return;
                                            } 
                                            resp.toArray().then(function(events) {
                                                for (var shift of shifts) {
                                                    if (users.map(function(x) { return x.staffNumber }).indexOf(shift.staffNumber) === -1) {
                                                        users.push({
                                                            firstName: shift.fullName.split(" ")[0],
                                                            lastName: shift.fullName.split(" ")[1],
                                                            staffNumber: shift.staffNumber
                                                        });
                                                    }
                                                }
                                                for (var event of events) {
                                                    if (users.map(function(x) { return x.staffNumber }).indexOf(event.staffNumber) === -1) {
                                                        users.push({
                                                            firstName: event.fullName.split(" ")[0],
                                                            lastName: event.fullName.split(" ")[1],
                                                            staffNumber: event.staffNumber
                                                        });
                                                    }
                                                }
                                                users.sort(function(a, b) {
                                                    if (a.firstName < b.firstName) {
                                                        return -1;
                                                    }
                                                    if (a.firstName > b.firstName) {
                                                        return 1;
                                                    }
                                                    return 0;
                                                });
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
                                                while (i <= req.query.to_week || j < req.query.to_year) {
                                                    var first = row;
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
                                                    var d = new Date(new Date(1547942400000 + (parseInt(i * 604800000))).getTime() + ((parseInt(j) - 2019) * 31536000000));
                                                    spreadsheet.cell(row, 1, row + 1, 1, true).string("Name").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thin" }, left: { style: "thick" } } });
                                                    spreadsheet.cell(row, 2, row + 1, 2, true).string("Staff No.").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thick" } } });
                                                    for (var n = 2; n <= 14; n += 2) {
                                                        spreadsheet.cell(row, n + 1, row, n + 2, true).string(("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear()).style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                        d.setDate(d.getDate() + 1);
                                                    }
                                                    row++;
                                                    for (var n = 2; n <= 14; n += 2) {
                                                        spreadsheet.cell(row, n + 1).string("In").style(styles.header).style({ border: { bottom: { style: "thick" }, left: { style: "thick" }, right: { style: "thin" } } });
                                                        spreadsheet.cell(row, n + 2).string("Out").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thick" } } });
                                                    }
                                                    row++;
                                                    var m = 0,
                                                        border = "thin",
                                                        changed;
                                                    for (var user of users) {
                                                        changed = false;
                                                        if (m === 3) {
                                                            border = "thick";
                                                        }
                                                        else {
                                                            border = "thin";
                                                        }
                                                        spreadsheet.cell(row, 1).string(user.firstName + " " + user.lastName).style(styles.user).style({ border: { bottom: { style: border }, right: { style: "thin" }, left: { style: "thick" } } });
                                                        spreadsheet.cell(row, 2).string(user.staffNumber).style(styles.user).style({ border: { bottom: { style: border }, right: { style: "thick" } } });
                                                        var col = 1;
                                                        for (var n = 0; n < 7; n++) {
                                                            col = col + 2;
                                                            var start = new Date(new Date(1547942400000 + (parseInt(i * 604800000))).getTime() + (n * 86400000) + ((parseInt(j) - 2019) * 31536000000)),
                                                                end = new Date(start),
                                                                week = weeks[weeks.map(function(x) { return x.weekNumber }).indexOf(i)],
                                                                values = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                                            end.setUTCHours(23, 59, 59);
                                                            spreadsheet.cell(row, col).style({ border: { bottom: { style: border }, right: { style: "thin" } } });
                                                            spreadsheet.cell(row, col + 1).style({ border: { bottom: { style: border }, right: { style: "thick" } } });
                                                            if (week[days[n]].closed === true) {
                                                                spreadsheet.cell(first, col, first, col + 1, true).string(values[n] + " (C)");
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
                                                                continue;
                                                            }
                                                            if (week[days[n]].bankHoliday === true) {
                                                                spreadsheet.cell(first, col, first, col + 1, true).string(values[n] + " (BH)");
                                                            }
                                                            for (var shift of shifts) {
                                                                if (shift.start > start.getTime() && shift.end < end.getTime() && shift.staffNumber == user.staffNumber) {
                                                                    var s = new Date(shift.start),
                                                                        e = new Date(shift.end),
                                                                        style;
                                                                    s.setUTCFullYear(1970, 0, 1);
                                                                    e.setUTCFullYear(1970, 0, 1);
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
                                                                    spreadsheet.cell(row, col).string(("0" + s.getUTCHours()).slice(-2) + ":" + ("0" + (s.getUTCMinutes())).slice(-2)).style(style);
                                                                    spreadsheet.cell(row, col + 1).string(("0" + e.getUTCHours()).slice(-2) + ":" + ("0" + (e.getUTCMinutes())).slice(-2)).style(style);
                                                                    changed = true;
                                                                }
                                                            }
                                                            for (var event of events) {
                                                                if (start.getTime() >= event.from && start.getTime() <= event.to && event.staffNumber == user.staffNumber) {
                                                                    var style;
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
                                                                    changed = true;
                                                                }
                                                            }
                                                        }
                                                        if (changed) {
                                                            m++;
                                                            if (m > 3) {
                                                                m = 0;
                                                            }
                                                        }
                                                        else {
                                                            spreadsheet.row(row).hide();
                                                        }
                                                        row++;
                                                    }
                                                    spreadsheet.cell(row, 1, row, 16).style({ border: { top: { style: "thick" } } });
                                                    i++;
                                                    if (i > 52) {
                                                        i = 1;
                                                        j++;
                                                    }
                                                    row++;
                                                }
                                                spreadsheet.setPrintArea(1, 1, row, 16);
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
                    res.send({
                        status: 400,
                        message: "Invalid Parameters Sent"
                    });
                }
            }
            else {
                res.send({
                    status: 400,
                    message: "Invalid Parameters Sent"
                });
            }
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Week Save Requests
app.post("/week/", function(req, res) {
    if (req.session.loggedin) {
        if (req.body.weekNumber && req.body.year) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                if (resp.manager === true) {
                    req.body.weekNumber = parseInt(req.body.weekNumber);
                    req.body.year = parseInt(req.body.year);
                    var invalid = false;
                    if (!isNaN(req.body.weekNumber) && !isNaN(req.body.year) && req.body.sun && req.body.mon && req.body.tue && req.body.wed && req.body.thu && req.body.fri && req.body.sat) {
                        for (var key of Object.keys(req.body)) {
                            if (key == "weekNumber" || key == "year") {
                                continue;
                            }
                            if (!req.body[key].openCustomers || !req.body[key].closedCustomers || !req.body[key].openStaff || !req.body[key].closedStaff) {
                                invalid = true;
                            }
                            else {
                                req.body[key].closed = (req.body[key].closed == "true");
                                req.body[key].bankHoliday = (req.body[key].bankHoliday == "true");
                                req.body[key].openCustomers = new Date(Date.UTC(1970, 0, 1, parseInt(req.body[key].openCustomers.split(":")[0]), parseInt(req.body[key].openCustomers.split(":")[1])));
                                req.body[key].closedCustomers = new Date(Date.UTC(1970, 0, 1, parseInt(req.body[key].closedCustomers.split(":")[0]), parseInt(req.body[key].closedCustomers.split(":")[1])));
                                req.body[key].openStaff = new Date(Date.UTC(1970, 0, 1, parseInt(req.body[key].openStaff.split(":")[0]), parseInt(req.body[key].openStaff.split(":")[1])));
                                req.body[key].closedStaff = new Date(Date.UTC(1970, 0, 1, parseInt(req.body[key].closedStaff.split(":")[0]), parseInt(req.body[key].closedStaff.split(":")[1])));
                                if (isNaN(req.body[key].openCustomers.getTime()) || isNaN(req.body[key].closedCustomers.getTime()) || isNaN(req.body[key].openStaff.getTime()) || isNaN(req.body[key].closedStaff.getTime())) {
                                    invalid = true;
                                }
                            }
                        }
                        if (invalid === false) {
                            req.db.collection("weeks").updateOne({
                                weekNumber: req.body.weekNumber,
                                year: req.body.year
                            }, {
                                $set: req.body
                            }, function(err, done) {
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                res.send({
                                    status: 200,
                                    message: "Week Settings Saved Successfully"
                                });
                            });
                        }
                        else {
                            res.send({
                                status: 400,
                                message: "Invalid Parameters Sent"
                            });
                        }
                    }
                    else {
                        res.send({
                            status: 400,
                            message: "Invalid Parameters Sent"
                        });
                    }
                }
                else {
                    res.send({
                        status: 401,
                        message: "Insufficient Privileges"
                    });
                }
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Leave Request Changes
app.post("/requests/", function(req, res) {
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            if (resp.manager === true) {
                req.body.from = parseInt(req.body.from);
                req.body.to = parseInt(req.body.to);
                if (req.body.staffNumber && req.body.from && !isNaN(req.body.from) && req.body.to && !isNaN(req.body.to) && (req.body.action == "approved" || req.body.action == "rejected")) {
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
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        req.db.collection("users").findOne({
                            staffNumber: req.body.staffNumber
                        }, function(err, user) {
                            if (err) {
                                res.send({
                                    status: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            if (user && user.email) {
                                sendmail({
                                    from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                    to: user.email,
                                    subject: "Your annual leave request has been " + req.body.action + ".",
                                    html: nunjucksEnv.render("./emails/request.html", { firstName: user.firstName, action: req.body.action, from: req.body.from, to: req.body.to, comment: req.body.comment })
                                });
                            }
                            res.send({
                                status: 200,
                                message: "Request Updated Successfully"
                            });
                        });
                    });
                }
                else {
                    res.send({
                        status: 400,
                        message: "Missing Fields"
                    });
                }
            }
            else {
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept New Additional Events
app.post("/event/", function(req, res) {
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            if (resp.manager === true) {
                req.body.from = new Date(req.body.from).getTime();
                req.body.to = new Date(req.body.to).getTime();
                req.body.team = resp.team;
                if (req.body.staffNumber && req.body.fullName && req.body.type && req.body.from && !isNaN(req.body.from) && req.body.to && !isNaN(req.body.to) && req.body.from <= req.body.to) {
                    if (req.body.type == "leave") {
                        req.body.status = "fixed";
                        req.body.manager_comment = null;
                        req.body.user_comment = null;
                    }
                    req.db.collection("users").findOne({
                        staffNumber: req.body.staffNumber
                    }, function(err, user) {
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        if (req.body.initial) {
                            req.body.initial.from = parseInt(req.body.initial.from);
                            req.body.initial.to = parseInt(req.body.initial.to)
                            req.db.collection("events").updateOne(req.body.initial, {
                                $set: {
                                    staffNumber: req.body.staffNumber,
                                    fullName: req.body.fullName,
                                    type: req.body.type,
                                    from: req.body.from,
                                    to: req.body.to
                                }
                            }, function(err, done) {
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                if (user && user.email) {
                                    sendmail({
                                        from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                        to: user.email,
                                        subject: "A new " + req.body.type +  " event has been created for you.",
                                        html: nunjucksEnv.render("./emails/event.html", { firstName: user.firstName, type: req.body.type, from: req.body.from, to: req.body.to, status: "created" })
                                    });
                                }
                                req.db.collection("users").findOne({
                                    staffNumber: req.body.initial.staffNumber
                                }, function(err, user) {
                                    if (err) {
                                        res.send({
                                            status: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    }
                                    if (user && user.email) {
                                        sendmail({
                                            from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                            to: user.email,
                                            subject: "Your " + req.body.type +  " event has been deleted.",
                                            html: nunjucksEnv.render("./emails/event.html", { firstName: user.firstName, type: req.body.type, from: req.body.from, to: req.body.to, status: "deleted" })
                                        });
                                    }
                                });
                                res.send({
                                    status: 200,
                                    message: "Event Updated Successfully"
                                });
                            });
                        }
                        else {
                            delete req.body.initial;
                            req.db.collection("events").insertOne(req.body, function(err, done) {
                                if (err) {
                                    res.send({
                                        status: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                if (user && user.email) {
                                    sendmail({
                                        from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                        to: user.email,
                                        subject: "A new " + req.body.type +  " event has been created for you.",
                                        html: nunjucksEnv.render("./emails/event.html", { firstName: user.firstName, type: req.body.type, from: req.body.from, to: req.body.to, status: "created" })
                                    });
                                }
                                res.send({
                                    status: 200,
                                    message: "Event Added Successfully"
                                });
                            });
                        }
                    });
                }
                else {
                    res.send({
                        status: 400,
                        message: "Missing Fields"
                    });
                }
            }
            else {
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Logout Requests
app.post("/logout/", function(req, res) {
    req.session.destroy();
    res.sendStatus(200);
});

// Accept User Deletion Requests
app.delete("/staff/", function(req, res) {
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            if (resp.manager === true) {
                req.db.collection("users").deleteOne({
                    staffNumber: req.body.staffNumber
                }, function(err, done) {
                    if (err) {
                        res.send({
                            status: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    res.send({
                        status: 200,
                        message: "User Deleted Successfully"
                    });
                })
            }
            else {
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Additional Event Deletion Requests
app.delete("/event/", function(req, res) {
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            if (err) {
                res.send({
                    status: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            if (resp.manager === true) {
                req.body.from = new Date(req.body.from).getTime();
                req.body.to = new Date(req.body.to).getTime();
                if (req.body && req.body.staffNumber && req.body.type && req.body.from && !isNaN(parseInt(req.body.from)) && req.body.to && !isNaN(parseInt(req.body.to))) {
                    req.db.collection("events").deleteOne({
                        staffNumber: req.body.staffNumber,
                        type: req.body.type,
                        from: req.body.from,
                        to: req.body.to
                    }, function(err, done) {
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        req.db.collection("users").findOne({
                            staffNumber: req.body.staffNumber
                        }, function(err, user) {
                            if (err) {
                                res.send({
                                    status: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            }
                            if (user && user.email) {
                                sendmail({
                                    from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                    to: user.email,
                                    subject: "Your " + req.body.type +  " event has been deleted.",
                                    html: nunjucksEnv.render("./emails/event.html", { firstName: user.firstName, type: req.body.type, from: req.body.from, to: req.body.to, status: "deleted" })
                                });
                            }
                            res.send({
                                status: 200,
                                message: "Event Deleted Successfully"
                            });
                        });
                    });
                }
                else {
                    res.send({
                        status: 400,
                        message: "Missing Fields"
                    });
                }
            }
            else {
                res.send({
                    status: 401,
                    message: "Insufficient Privileges"
                });
            }
        });
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Run Server
var server = app.listen(config.app.port, function() {
    console.log("RotaIt Management Running - Port " + config.app.port);
});