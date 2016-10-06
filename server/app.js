"use strict"
const express = require('express');
const bodyParser = require('body-parser');
const config = require(__dirname+'/config/app');
var app = new express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function(req, res, next) {  
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});
app.use('/', require('./routes'));

// Normally static content would be served remotely
if (config.debug) {
    app.use(express.static('../client'));
}

exports = module.exports = app;