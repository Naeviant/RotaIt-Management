// Module Imports
var express = require("express"),
    session = require("express-session"),
    nunjucks = require("express-nunjucks"),
    mongodb = require("express-mongo-db"),
    bodyParser = require("body-parser"),
    cookieParser = require("cookie-parser"),
    fs = require("fs"),
    config = require("./config.json"),
    package = require("./package.json");

// Setup Express App
var app = express();
var njk = nunjucks(app, {
    watch: true,
    noCache: true,
    filters: {
        date: function(d) {
            return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth()+1)).slice(-2) + "/" + d.getFullYear();
        }
    }
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
            req.db.collection("users").find({
                team: resp.team
            }, {
                sort: [["firstName", "ascending"]]
            }, function(err, resp) {
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

// Get Partial - New Staff
app.get("/partial/staff_manage/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query && req.query.staffNumber) {
            req.db.collection("users").findOne({
                staffNumber: req.query.staffNumber
            }, function(err, resp) {
                if (resp) {
                    resp.dob = resp.dob.getFullYear() + "-" + (resp.dob.getMonth() + 1) + "-" + resp.dob.getDate();
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
            if (req.query.year >= 2000 && req.query.week >= 1 && req.query.week <= 53) {
                req.db.collection("users").findOne({
                    staffNumber: req.session.loggedin
                }, function(err, resp) {
                    req.db.collection("users").find({
                        team: resp.team
                    }, {
                        sort: [["firstName", "ascending"]]
                    }, function(err, resp) {
                        resp.toArray().then(function(team) {
                            req.db.collection("weeks").findOne({
                                weekNumber: req.query.week,
                                year: req.query.year
                            }, function(err, week) {
                                if (!week) {
                                    var newWeek = true;
                                    week = {
                                        weekNumber: req.query.week,
                                        year: req.query.year,
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
                                    week: week
                                });
                                if (newWeek) {
                                    req.db.collection("weeks").insertOne(week);
                                }
                            });
                        });
                    });
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

// Get Week Data
app.get("/week/", function(req, res) {
if (req.session.loggedin) {
        if (req.query.week && req.query.year) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (resp.manager === true) {
                    req.query.week = parseInt(req.query.week);
                    req.query.year = parseInt(req.query.year);
                    req.db.collection("weeks").findOne({
                        weekNumber: req.query.week,
                        year: req.query.year
                    }, function(err, week) {
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
                if (resp.manager === true) {
                    req.query.week = parseInt(req.query.week);
                    req.query.year = parseInt(req.query.year);
                    req.db.collection("shifts").find({
                        weekNumber: req.query.week,
                        year: req.query.year
                    }, function(err, shifts) {
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
        if (!err) {
            if (resp) {
                if (resp.manager === true) {
                    req.session.loggedin = resp.staffNumber;
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
        }
        else {
            res.send({
                status: 500,
                message: "Database Connection Failure"
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
            if (resp.manager === true) {
                req.body.newUser = (req.body.newUser == "true");
                req.body.dob = new Date(req.body.dob);
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
                        console.log(exists, req.body)
                        if (exists && !req.body.newUser) {
                            delete req.body.newUser;
                            req.db.collection("users").updateOne({
                                staffNumber: req.body.staffNumber
                            }, req.body, function(err, done) {
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
                if (resp.manager === true) {
                    req.db.collection("users").updateOne({
                        staffNumber: req.body.staffNumber
                    }, {
                        $set: {
                            password: req.body.password
                        }
                    }, function(err, done) {
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

// Accept Save Rota Requests
app.post("/rota/save/", function(req, res) {
    if (req.session.loggedin) {
        if (req.body.weekNumber && req.body.year && req.body.shifts) {
            req.db.collection("users").findOne({
                staffNumber: req.session.loggedin
            }, function(err, resp) {
                if (resp.manager === true) {
                    req.body.weekNumber = parseInt(req.body.weekNumber);
                    req.body.year = parseInt(req.body.year);
                    if (!isNaN(req.body.weekNumber) && !isNaN(req.body.weekNumber)) {
                        for (shift of req.body.shifts) {
                            shift.start = new Date(shift.start).getTime();
                            shift.end = new Date(shift.end).getTime();
                            shift.breaks = parseInt(shift.breaks);
                            shift.provisional = true;
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
            if (resp.manager === true) {
                req.db.collection("users").deleteOne({
                    staffNumber: req.body.staffNumber
                }, function(err, done) {
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

// Run Server
var server = app.listen(config.app.port, function() {
    console.log("RotaIt Management Running - Port " + config.app.port);
});