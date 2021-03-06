var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var OrderSchema = new Schema({
    user_id: {
        type: String,
        required: true
    },
    product_id: {
        type: String,
        required: true
    },
    product_name: {
        type: String,
        required: true
    },
    place_id: {
        type: String,
        default: ""
    },
    order_date: {
        type: Date,
        default: Date.now
    },
    order_num: {
        type: Number,
        required: true
    },
    product_price: {
        type: Number,
        required: true
    },
    order_status: {
        type: String,
        default: "ordered"
    },
    order_notes: {
        type: String,
        default: ""
    }
});

module.exports = mongoose.model('Order', OrderSchema);