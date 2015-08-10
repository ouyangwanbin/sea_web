var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ProductSchema = new Schema({
    product_name: {
        type: String,
        required: true,
    },
    product_price: {
        type: Number,
        required: true
    },
    product_unit: {
        type: String,
        required: true
    },
    product_image: {
        type: String
    },
    product_description: {
        type: String
    },
    product_quantity:{
        type:Number,
        required:true
    }

});

module.exports = mongoose.model('Product', ProductSchema);