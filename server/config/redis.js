"use strict"
require('dotenv').config();
module.exports = {  
  'host': process.env.REDIS_HOST || 'localhost',
  'port': process.env.REDIS_PORT || 6379
};