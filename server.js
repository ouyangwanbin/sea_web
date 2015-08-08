var serverPort = 9337;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var session = require('client-sessions');


app.use(bodyParser.urlencoded({
    extended: true
}));


app.use(bodyParser.json());


app.use(session({
    cookieName: 'session',
    secret: 'fsW@@%^dfsdifsdfuisiq@sdASd2',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}));



app.use("/", express.static('client'));

// app.use(function(req, res, next) {
//     if (req.session && req.session.user) {

//         User.findOne({
//                     email: req.session.user.email
//                 }, function(err, user) {
//                     if (user) {
//                         req.user = user;
//                         delete req.user.password; // delete the password from the session
//                         req.session.user = user; //refresh the session value
//                         res.locals.user = user;
//                     }
//                     finishing processing the middleware and run the route

//         next();
//     });

// } else {
// next();
// }
// });

// function requireLogin(req, res, next) {
//     if (!req.user) {
//         res.redirect('/login');
//     } else {
//         next();
//     }
// };


app.get('/products', function(req, res) {
    var result = {};
    var products = [];
    var product1 = {
        "id":"p1",
        "name": "crab",
        "price": 19.23
    }
    var product2 = {
        "id":"p2",
        "name": "shrimp",
        "price": 21.00
    }
    console.log(product2);
    result["status"] = "success";
    products.push(product1);
    products.push(product2);

    result["data"] = products;
    setTimeout(function() {
        res.json(result);
    }, 2000);
})

/*
app.get('/search-user/:user_email', function(req, res) {
    // var user_email = req.params.user_email;
    // var url = restUrl + "/search-user/" + user_email;
    // rest.get(url).on('complete', function(result) {
    //     if (result instanceof Error) {
    //         console.log('Error:', result.message);
    //     } else {
    //         console.log(result);
    //         res.json(result);
    //     }
    // });

}).post('/users', function(req, res) {
    // var email = req.body.email;
    // var password = req.body.password;
    // var url = restUrl + '/users'
    // rest.post(url, {
    //     data: {
    //         email: email,
    //         password: password
    //     }
    // }).on('complete', function(data, response) {
    //     console.log(data);
    //     res.json(data);
    // });
}).post('login', function(req, res) {
    // var email = req.body.email;
    // var password = req.body.password;
    // var url = restUrl + '/login';
    // rest.post(url, {
    //     data: {
    //         email: email,
    //         password: password
    //     }
    // }).on('complete', function(data, response) {
    //     console.log(data);
    //     res.json(data);
    // });
});
*/
app.listen(serverPort);
console.log('sea web server listening on: ' + serverPort);
