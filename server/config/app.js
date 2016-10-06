"use strict"
require('dotenv').config();
module.exports = {  
  'secret': process.env.SECRET || 'MySecretKey',
  'port': process.env.PORT || 7777,
  'debug': process.env.DEBUG || false
};