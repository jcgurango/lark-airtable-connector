// Read .env file.
require('dotenv').config();

// Bootstrap the application.
const coordinator = require('./coordinator');

coordinator.start();
