const express = require('express');
const app = express();

const forms = require('./routes/forms');
app.use('/forms', forms);

module.exports = {
  start: (port) => {
    return new Promise((resolve) => {
      app.listen(port, resolve);
    });
  },
};
