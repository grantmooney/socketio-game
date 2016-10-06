"use strict";

const jwt = require('jsonwebtoken'),
      models = require('../models'),
      config = require('../config/app');

// Generate JWT
function generateToken(user) {
  return jwt.sign(user, config.secret, {
    expiresIn: 10080 // in seconds
  });
}

// Set user info from request
function getUserInfo(user) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  };
}

//========================================
// Login Route
//========================================
exports.login = function(req, res, next) {
  let userInfo = getUserInfo(req.user);
  res.json({
    token: generateToken(userInfo),
    user: userInfo
  });
}

//========================================
// Registration Route
//========================================
exports.register = function(req, res, next) {
  // Check for registration errors
  const inputData = {
      email: req.body.email,
      password: req.body.password,
      first_name: req.body.first_name,
      last_name: req.body.last_name
    };

  if (!inputData.email) { return res.status(422).send({ error: 'You must enter an email address.'}); }
  if (!inputData.first_name || !inputData.last_name) { return res.status(422).send({ error: 'You must enter your full name.'}); }
  if (!inputData.password) { return res.status(422).send({ error: 'You must enter a password.' }); }

  models.User.findOne({ email: inputData.email }).then(function(existingUser) {
      if (existingUser) {
        return res.status(422).send({ error: 'That email address is already in use.' });
      }

      User.create(inputData).then(function(user) {
        let userInfo = getUserInfo(user);
        res.json({
          token: generateToken(userInfo),
          user: userInfo
        });
      });
  });
}