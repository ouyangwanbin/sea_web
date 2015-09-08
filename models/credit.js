var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CreditSchema = new Schema({
    user_id: {
        type: String,
        required: true
    },
    credit: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Credit', CreditSchema);