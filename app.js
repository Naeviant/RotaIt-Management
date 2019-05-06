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
    noCache: true
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

// Get Partials
app.get("/partial/", function(req, res) {
    if (req.query.page) {
        if (fs.existsSync("./views/partials/" + req.query.page + ".html")) {
            res.render("partials/" + req.query.page)
        }
        else {
            res.render("partials/error", {
                code: 404,
                message: "The page you requested was not found."
            });
        }
    }
    else {
        res.send("");
    }
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