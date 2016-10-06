// Importing Passport, strategies, and config
const passport = require('passport'),  
  models = require('../models'),
  config = require('../config/app'),
  passportJwt = require('passport-jwt'),
  LocalStrategy = require('passport-local').Strategy;

// Setting up local login strategy
var localLogin = new LocalStrategy({ 
  usernameField:"email",
  passwordField:"password"
}, function(email, password, done) {  
  models.User.findOne({
    email: email
  }).then(function(user) {
    if(!user) { return done(null, false, { error: 'Your login details could not be verified. Please try again.' }); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) { return done(err); }
      if (!isMatch) { return done(null, false, { error: "Your login details could not be verified. Please try again." }); }
      return done(null, user);
    });
  });
});

// Setting up JWT login strategy
var jwtLogin = new passportJwt.Strategy({
  jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeader(),
  secretOrKey: config.secret
}, function(payload, done) {
  models.User.findById(payload.id).then(function(user) {
    if (!user) {
      done(null, false);
    } else {
      done(null, user);
    }
  });
});

passport.use(jwtLogin);  
passport.use(localLogin);