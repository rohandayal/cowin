const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/cowin', { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

module.exports = {
    db: db
}
