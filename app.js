// Module Imports
var express = require("express"),
    session = require("express-session"),
    nunjucks = require("express-nunjucks"),
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

// App Local Variables
app.locals = {
    version: package.version
}

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
            })
        }
    }
    else {
        res.send("");
    }
});

// Run Server
var server = app.listen(config.app.port, function() {
    console.log("RotaIt Management Running - Port " + config.app.port);
});