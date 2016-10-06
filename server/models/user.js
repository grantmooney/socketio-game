'use strict';
const bcrypt = require("bcrypt-nodejs");
module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        unique: 'true'
    },
    password_hash: DataTypes.STRING,
    password: {
        type: DataTypes.VIRTUAL,
        set: function(val) {
          this.setDataValue('password', val); // Remember to set the data value, otherwise it won't be validated
          this.setDataValue('password_hash', bcrypt.hashSync(val));
        },
        validate: {
          isLongEnough: function (val) {
            if (val.length < 6) {
              throw new Error("Please choose a longer password")
          }
        }
      }
    },
    first_name: {
        type: DataTypes.STRING,
        field: 'first_name'
    },
    last_name: {
        type: DataTypes.STRING,
        field: 'last_name'
    },
    birthday: {
        type: DataTypes.DATE
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    instanceMethods: {
      comparePassword: function (candidatePassword, cb) {
        bcrypt.compare(candidatePassword, this.password_hash, function(err, isMatch) {
          if (err) { return cb(err); }
          cb(null, isMatch);
        });
      }
    }
  });
  return User;
};