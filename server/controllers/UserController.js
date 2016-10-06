"use strict"
const models = require('../models');

exports.getUser = function(req, res, next) {
  const userId = req.params.user_id;
  if (!req.user._id == userId) { return res.status(401).json({ error: 'You are not authorized to view this user profile.'}); }
  models.User.findById(userId).then(function(user) {
    if (!user) {
      res.status(400).json({ error: 'No user could be found for this ID.' });
    }
    res.status(200).json({ user: user });
  });
}

exports.getUsers = function(req, res, next) {
  models.User.findAll({
    attributes: ['id', 'email', 'first_name', 'last_name', 'birthday']
  }).then(function(users) {
    res.json(users);
  });
}