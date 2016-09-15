var serverPort = 9337;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var session = require('client-sessions');
var mongoose = require('mongoose');
var email = require('./node_modules/emailjs/email');

var User = require('./models/user');
var Product = require('./models/product');
var Order = require('./models/order');
var Place = require('./models/place');
var bcrypt = require('bcryptjs');

var braintree = require("braintree");

var gateway = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: 'r7kq67796gfw4d7q',
    publicKey: '42yh4wyp4ndk29pf',
    privateKey: '4bcebe8836b4ab140823ef92d06c064b'
});
//set up database
mongoose.connect('mongodb://ouyangwanbin:abc123@ds033106.mlab.com:33106/go2fish');


var mailServer = {
    "smtp": "smtp.mail.yahoo.com",
    "userName": "wanbinouyang@yahoo.com",
    "password": "eU5eY7hP123"
}

// var mailServer = {
//     "smtp": "smtp.gmail.com",
//     "userName": "go2fish2016@gmail.com",
//     "password": "abc123!@#"
// }

function makeString(num) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()|}{';/.,:?<>";

    for (var i = 0; i < num; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

app.use(bodyParser.urlencoded({
    extended: true
}));


app.use(bodyParser.json());

app.use(session({
    cookieName: 'session',
    secret: makeString(27),
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}));


app.use("/", express.static('client'));

app.use(function(req, res, next) {
    if (req.session && req.session.user) {
        User.findOne({
            email: req.session.user.email
        }, function(err, user) {
            if (user) {
                req.session.user = user; //refresh the session value
            }
            next();
        });
    } else {
        next();
    }
});

app.post("/confirm", requireLogin, function(req, res) {

    var place_id = req.body.place_id;
    var order_notes = req.body.order_notes;
    Order.update({
        user_id: req.session.user._id,
        order_status: 'ordered'
    }, {
        $set: {
            place_id: place_id,
            order_notes: order_notes,
            order_status: 'confirm'
        }
    }, function(err) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        res.json({
            status: "success"
        })
    });
});

app.get("/client_token", requireLogin, function(req, res) {
    gateway.clientToken.generate({}, function(err, response) {
        if (err) {
            response.status = 500;
            res.json(response);
            return;
        }
        var result = {};
        result.status = "success";
        result.data = response.clientToken;
        res.json(result);
    });
});

app.post("/payment", requireLogin, function(req, res, next) {
    var amount = req.body.amount;
    var nonce = req.body.payment_method_nonce;
    var place_id = req.body.place_id;
    var order_notes = req.body.order_notes;
    gateway.transaction.sale({
        amount: amount,
        paymentMethodNonce: nonce
    }, function(err, result) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        //update databases for orders and products
        Order.find({
            user_id: req.session.user._id,
            order_status: "ordered"
        }, function(err, orders) {
            if (err) {
                res.status = 500;
                return next(err);
            }

            function asyncLoop(i, callback) {
                if (i < orders.length) {
                    Order.update({
                        _id: orders[i]._id
                    }, {
                        $set: {
                            order_status: "paid"
                        }
                    }, function(err) {
                        if (err) {
                            res.status = 500;
                            return next(err);
                        }
                        asyncLoop(i + 1, callback);
                    });
                } else {
                    callback();
                }
            }
            asyncLoop(0, function() {
                res.send(result);
            });
        });
    });
});



function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.json({
            status: "fail"
        })
    }
};


app.get('/products', function(req, res) {
    Product.find({
        product_quantity: {
            $gt: 0
        }
    }, function(err, products) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        var result = {};
        result.status = "success";
        if (req.session && req.session.user) {
            result["login"] = true;
        } else {
            result["login"] = false;
        }
        result.data = {
            products: products
        }
        result["data"] = products;
        res.json(result);
    })
}).post('/register', function(req, res, next) {
    var email = req.body.email;
    User.count({
        email: email
    }, function(err, count) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        if (count > 0) {
            res.status = 400;
            return next(new Error("email is in use"));
        }
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(req.body.password, salt);

        // create a instance of User model
        var user = new User();
        user.email = email;
        user.password = hash;
        user.id_receive_msg = req.body.isReceive;
        // save the user and check for errors
        user.save(function(err) {
            if (err) {
                res.status = 500;
                return next(err);
            }
            var result = {};
            result.status = "success"
            res.json(result);
        });
    })
}).post('/login', function(req, res, next) {
    var email = req.body.email;
    var password = req.body.password;

    User.findOne({
        email: req.body.email
    }, function(err, user) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        if (!user) {
            res.status = 400;
            return next(new Error('user name/password error'))
        } else {
            if (bcrypt.compareSync(password, user.password)) {
                req.session.user = user;
                res.json({
                    status: "success"
                });
            } else {
                res.status = 400;
                return next(new Error('user name /password error'));
            }
        }
    })
}).get('/orders', requireLogin, function(req, res, next) {
    Order.find({
        user_id: req.session.user._id
    }, function(err, orders) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        var result = {};
        result.status = "success";
        result.data = {
            orders: orders
        }
        result["data"] = orders;
        res.json(result);
    })
}).get('/logout', requireLogin, function(req, res, next) {
    Order.remove({
        user_id: req.session.user._id,
        order_status: "ordered"
    }, function(err) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        req.session.reset();
        res.json({
            status: "success"
        });
    })


}).post('/shopcart', requireLogin, function(req, res, next) {
    var product_id = req.body.product_id;
    var order_num = req.body.order_num;
    Product.findOne({
        _id: product_id
    }, function(err, product) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        if (!product) {
            res.status = 404;
            return next(new Error("Can not find the product"));
        }
        Product.update({
            _id: product_id
        }, {
            $inc: {
                product_quantity: -order_num
            }
        }, function(err) {
            if (err) {
                res.status = 500;
                return next(err);
            }
            Order.findOne({
                user_id: req.session.user._id,
                product_id: product_id,
                order_status: "ordered"
            }, function(err, order) {
                console.log('order : ' + order);
                if (err) {
                    res.status = 500;
                    return next(err);
                }
                if (!order) {
                    var orderNew = new Order();
                    orderNew.user_id = req.session.user._id;
                    orderNew.product_id = product_id;
                    orderNew.order_num = order_num;
                    orderNew.product_price = product.product_price;
                    orderNew.product_name = product.product_name;
                    orderNew.save(function(err) {
                        if (err) {
                            res.status = 500;
                            return next(err);
                        }
                        Order.find({
                            user_id: req.session.user._id,
                            order_status: "ordered"
                        }, function(err, orders) {
                            if (err) {
                                res.status = 500;
                                return next(err);
                            }
                            res.json({
                                status: "success",
                                data: orders
                            });
                        });
                    })
                } else {
                    //update
                    Order.update({
                        user_id: req.session.user._id,
                        product_id: product_id,
                        order_status: "ordered"
                    }, {
                        $inc: {
                            order_num: order_num
                        }
                    }, function(err) {
                        if (err) {
                            res.status = 500;
                            return next(err);
                        }
                        Order.find({
                            user_id: req.session.user._id,
                            order_status: "ordered"
                        }, function(err, orders) {
                            if (err) {
                                res.status = 500;
                                return next(err);
                            }
                            res.json({
                                status: "success",
                                data: orders
                            });
                        });
                    })
                }
            });
        });
    });
}).get('/shopcart', requireLogin, function(req, res, next) {
    var result = {};
    result.status = "success";
    result.data = {};
    result.data.orders = [];
    result.data.places = [];

    Place.find({}, function(err, places) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        result.data.places = places;
        Order.find({
            user_id: req.session.user._id,
            order_status: "ordered"
        }, function(err, orders) {
            if (err) {
                res.status = 500;
                return next(err);
            }
            result.data.orders = orders;
            res.json(result);
        });
    })
}).get('/shopcartItems', requireLogin, function(req, res, next) {
    Order.find({
        order_status: "ordered",
        user_id: req.session.user._id
    }, function(err, orders) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        res.json({
            status: "success",
            data: orders
        })
    })

}).post('/forgetPassword', function(req, res, next) {

    User.findOne({
        email: req.body.email
    }, function(err, user) {
        if (err) {
            res.status = 500;
            return next(err);
        }
        if (!user) {
            res.status = 404
            return next(new Error("user does not exist"));
        }
        var newPassword = makeString(8);
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(newPassword, salt);
        User.update({
            _id: user._id
        }, {
            $set: {
                password: hash
            }
        }, function(err) {
            if (err) {
                res.status = 500;
                return next(err);
            }
            var server = email.server.connect({
                user: mailServer.userName,
                password: mailServer.password,
                host: mailServer.smtp,
                ssl: true
            });
            var sendTo = req.body.email;
            server.send({
                text: "You new password is : " + newPassword,
                from: mailServer.userName,
                to: sendTo,
                subject: "go2fish new password"
            }, function(err, message) {
                console.log(err || message);
                if (err) {
                    res.json({
                        status: "failed"
                    })
                } else {
                    res.json({
                        status: "success"
                    })
                }
            });
        });

    });

});

// error handle
app.use(function(err, req, res, next) {
    var result = {};
    if (res.status === 500) {
        result.status = "error";
        result.msg = err.message || "server side error";
    } else if (res.status === 401) {
        result.status = "fail";
        result.msg = err.message || "authenticate failed";
    } else if (res.status === 400) {
        result.status = "fail";
        result.msg = err.message || "Can not find the resources";
    }
    res.json(result);
});
app.listen(serverPort);
console.log('sea web server listening on: ' + serverPort);
