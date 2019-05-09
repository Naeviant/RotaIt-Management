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

// Get Partials - Team
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
        res.send("");
    }
});

// Get Partials - Rota Search
app.get("/partial/rota/", function(req, res) {
    if (req.session.loggedin) {
        res.render("partials/rota_search");
    }
    else {
        res.send("");
    }
});

// Get Partials - Rota Manage
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

// Get Partial 404
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
                        message: "Insufficient Priviledges"
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

// Accept Logout Requests
app.post("/logout/", function(req, res) {
    req.session.destroy();
    res.sendStatus(200);
});

// Run Server
var server = app.listen(config.app.port, function() {
    console.log("RotaIt Management Running - Port " + config.app.port);
});