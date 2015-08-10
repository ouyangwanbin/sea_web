var serverPort = 9337;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var session = require('client-sessions');
var mongoose = require('mongoose');

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
mongoose.connect('mongodb://localhost:27017/sea');


function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()|}{';/.,:?<>";

    for (var i = 0; i < 27; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

app.use(bodyParser.urlencoded({
    extended: true
}));


app.use(bodyParser.json());

app.use(session({
    cookieName: 'session',
    secret: makeid(),
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}));

app.use(session({
    cookieName: 'shopcart',
    secret: makeid(),
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
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
            // finishing processing the middleware and run the route
            next();
        });
    } else {
        next();
    }
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
            res.status = "500";
            return next(err);
        }
        //update databases for orders and products
        function asyncLoop(i, callback) {
            if (i < req.shopcart.orders.length) {
                var cartorder = req.shopcart.orders[i];
                Product.findOne({
                    _id: cartorder.product_id
                }, function(err, product) {
                    console.log(product);
                    if (err) {
                        res.status = "500";
                        return next(err);
                    }
                    if (!product) {
                        res.status = "404";
                        return next(new Error("no product found"));
                    }
                    var order = new Order();
                    order.product_id = cartorder.product_id;
                    order.order_num = cartorder.order_num;
                    order.product_price = product.product_price;
                    order.order_notes = order_notes;
                    order.place_id = place_id;
                    order.user_id = req.session.user._id;

                    order.save(function(err) {
                        if (err) {
                            res.status = "500";
                            return next(err);
                        }
                        Product.update({
                            _id: cartorder.product_id
                        }, {
                            $inc: {
                                product_quantity: -order.order_num
                            }
                        }, function(err) {
                            if (err) {
                                res.status = "500";
                                return next(err);
                            }
                            asyncLoop(i + 1, callback);
                        });
                    });

                })
            } else {
                callback();
            }
        }
        asyncLoop(0, function() {
            //empty the shopcart session
            req.shopcart.reset();
            res.send(result);
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
        setTimeout(function() {
            res.json(result);
        }, 2000);
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
            return next(new Error("邮箱已经被注册"));
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
            return next(new Error('用户名/密码错误'))
        } else {
            if (bcrypt.compareSync(password, user.password)) {
                req.session.user = user;
                res.json({
                    status: "success"
                });
            } else {
                res.status = 400;
                return next(new Error('用户名/密码错误'));
            }
        }
    })
}).get('/logout', requireLogin, function(req, res, next) {
    req.session.reset();
    req.shopcart.reset();
    res.json({
        status: "success"
    });
}).post('/shopcart', requireLogin, function(req, res, next) {
    var product_id = req.body.product_id;
    var order_num = req.body.order_num;
    if (!req.shopcart.orders) {
        req.shopcart.orders = [];
    }
    var order = {};
    order.product_id = product_id;
    order.order_num = Number(order_num);
    var flag = false; //check if the product has been put in the shopcart.
    for (var i = 0; i < req.shopcart.orders.length; i++) {
        if (order.product_id === req.shopcart.orders[i].product_id) {
            req.shopcart.orders[i].order_num += order.order_num;
            flag = true;
            break;
        }
    }
    //if the product is not in the shopcart
    if (!flag) {
        req.shopcart.orders.push(order);
    }
    res.json({
        status: "success",
        data: req.shopcart.orders
    })
}).get('/shopcart', requireLogin, function(req, res, next) {
    var result = {};
    result.status = "success";
    result.data = {};
    result.data.orders = [];
    result.data.places = [];

    function asyncLoop(i, callback) {
        console.log(i);
        if (i < req.shopcart.orders.length) {
            var order = req.shopcart.orders[i];
            Product.findOne({
                _id: order.product_id
            }, function(err, product) {
                console.log(product);
                if (err) {
                    res.status = "500";
                    return next(err);
                }
                if (!product) {
                    res.status = "404";
                    return next(new Error("no product found"));
                }
                order.product_name = product.product_name;
                order.product_price = product.product_price;
                result.data.orders.push(order);
                asyncLoop(i + 1, callback);
            })
        } else {
            Place.find({}, function(err, places) {
                console.log(places);
                result.data.places = places;
                callback();
            });
        }
    }
    if (req.shopcart && req.shopcart.orders && req.shopcart.orders.length > 0) {
        asyncLoop(0, function() {
            res.json(result);
        })
    } else {
        res.json(result);
    }
}).get('/shopcartItems', requireLogin, function(req, res, next) {
    res.json({
        status: "success",
        data: req.shopcart.orders
    })
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