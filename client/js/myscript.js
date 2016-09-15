$(document).bind('mobileinit', function() {
    $.mobile.loader.prototype.options.text = "loading";
    $.mobile.loader.prototype.options.textVisible = false;
    $.mobile.loader.prototype.options.theme = "a";
    $.mobile.loader.prototype.options.html = "";

    //init shop cart
    var shopcart = {};

});

function jump(page) {
    $.mobile.changePage(page);
}

function showHide( isLogin ){
    if(isLogin){
        $("#gfooter").show();
        $("#navLoginBtn").hide();
        $("#navLogoutBtn").show();
    }else{
        $("#gfooter").hide();
        $("#navLoginBtn").show();
        $("#navLogoutBtn").hide();
    }
}

function validateEmail(email) {
    var email = $.trim(email);
    var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    return re.test(email);
}

$(document).on({
    ajaxSend: function() {
        $.mobile.showPageLoadingMsg();
    },
    ajaxStart: function() {
        $.mobile.showPageLoadingMsg();
    },
    ajaxStop: function() {
        $.mobile.hidePageLoadingMsg();
    },
    ajaxError: function() {
        $.mobile.hidePageLoadingMsg();
    }
});

$(document).on('pagebeforeshow', '#home', function(e, data) {
    $("#products").empty();
    //get shop cart infomation
    $.ajax({
        type:'GET',
        url:'/shopcartItems',
        dataType:'json',
        success:function( result ){
            if( result.status === "success" ){
                var data = result.data;
                if( data && data.length > 0 ){
                    $("#shopcartNum").text('('+data.length+')');
                    return;
                }
            }
            $("#shopcartNum").hide();
        }
    });
})

$(document).on('pageshow', '#home', function(e, data) {
    $("#navLogoutBtn").on('click', function() {
        $.ajax({
            type:'GET',
            url:'/logout',
            success:function( result ){
                if(result.status === "fail"){
                    jump("#login");
                    return false;
                }
                if(result.status === "success"){
                    window.location.href="/";
                }
            }
        });
    });
    $.ajax({
        type: 'GET',
        url: '/products',
        dataType: 'json',
        success: function(result) {
            if (!result) {
                console.log("error");
                return;
            }
            if (result.status !== "success") {
                console.log("faild to load data");
                return;
            }
            var isLogin = result.login;
            showHide( isLogin );
            
            var products = result.data;
            for (var i = 0; i < products.length; i++) {
                console.log(products[i]);
                var productHtml = '<div class="ui-block-a" style="margin-top:10px;">' 
                                    + '<div class="ui-body ui-body-d ui-corner-all ui-shadow">' 
                                    + '<img src="images/' + products[i].product_image + '" />' 
                                    + '<h2 class="ui-btn-left">' + products[i].product_name + '</h2>' 
                                    + '<label for="price" class="ui-btn-right">$' + parseFloat(products[i].product_price).toFixed(2) + '/' + products[i].product_unit + '</label>' 
                                    + '<div class="content">' 
                                    + '<a href="#" id="'+products[i]._id+'_minus" data-role="button" data-inline="true" data-icon="minus" data-iconpos="notext"></a>' 
                                    + '<input type="text" id="'+products[i]._id+'_order_num" for="price" data-inline="true" value="1" disabled style="display:inline-block;width:15%;vertical-align:middle;" />' 
                                    + '<a href="#" id="'+products[i]._id+'_plus" data-role="button" data-inline="true" data-icon="plus" data-iconpos="notext"></a>' 
                                    + '<label>in stock:' + products[i].product_quantity + '</label>' 
                                    + '<input type="button" value="add to shopcart" id="' + products[i]._id + '"/>' 
                                    + '</div>' + '</div>' + '</div>';
                $("#products").append(productHtml);
                $("#" + products[i]._id + "_minus").bind('click', products[i], function( event ){
                    var product = event.data;
                    var num = Number($("#"+product._id+"_order_num").val());
                    if(num === 1){
                        return;
                    }
                    num-=1;
                    $("#"+product._id+"_order_num").val(num);
                });

                $("#" + products[i]._id + "_plus").bind('click', products[i] ,function( event ){
                    var product = event.data;
                    var num = Number($("#"+product._id+"_order_num").val());
                    if(num === product.product_quantity){
                        return;
                    }
                    num+=1;
                    $("#"+product._id+"_order_num").val(num);
                });

                $("#" + products[i]._id).bind('click', products[i], function(event) {
                    if (!isLogin) {
                        jump("#login");
                        return false;
                    }
                    var product = event.data;
                    $.ajax({
                        type: 'POST',
                        url: '/shopcart',
                        data: {
                            product_id: product._id,
                            order_num: $("#"+product._id+"_order_num").val()
                        },
                        dataType: 'json',
                        success: function(result) {
                            if(result.status === "success"){
                                var orders = result.data;
                                console.log(orders);
                                if( !orders || orders.length === 0){
                                    $("#shopcartNum").css("display","none");
                                    return;
                                }
                                $("#shopcartNum").css("display","");
                                var label = $("#shopcartNum").text();
                                var num = Number(label.substring(1,label.length-1));
                                num=orders.length;
                                $("#shopcartNum").text('('+num+')');
                            }
                        }
                    });

                });
            }
            $("#home").trigger("pagecreate");
        }
    });
});


$(document).on('pagecreate', '#login', function(e, data) {
    $("#loginBtn").on('click', function() {
        var email = $.trim($("#lemail").val());
        var password = $("#lpassword").val();
        $.ajax({
            type: 'POST',
            url: '/login',
            data: {
                email: email,
                password: password
            },
            dataType: 'json',
            success: function(result) {
                console.log(result);
                if (result.status !== "success") {
                    $("#loginMsg").text(result.msg);
                    return false;
                }
                $("#gfooter").css("display", "block");
                $("#navLoginBtn").css("display", "none");
                $("#navLogoutBtn").css("display", "block");
                jump('#home');
            }
        });
    });
});

$(document).on('pagebeforeshow','#forget',function(e, data){
    $("#forgetMsg").empty();
    $("#forgetBtn").on("click",function(){
        if(!validateEmail($("#femail").val())){
            $("#forgetMsg").css("color","red").text("invalid email format");
            return false;
        }
        $.ajax({
            type:'POST',
            url:'/forgetPassword',
            data:{
                email:$.trim($("#femail").val())
            },
            dataType:'json',
            success:function(result){
                if(result.status !== "success"){
                    $("#forgetMsg").css("color","red").text("failed to send email");
                    return false;
                }
                $("#forgetMsg").css("color","green").text("new password has been set to :" + $.trim($("#femail").val()));
            }
        })
    });
});


$(document).on('pagecreate', '#register', function(e, data) {
    $("#registerBtn").on('click', function() {
        console.log($("#isReceive").is(':checked'));

        if (!validateEmail($("#remail").val())) {
            $("#registerMsg").text("invalid email format");
            return false;
        }

        if ($("#rpassword").val().length === 0) {
            $("#registerMsg").text("please input your password");
            return false;
        }

        if ($("#rpassword").val() !== $("#rerpassword").val()) {
            $("#registerMsg").text("passwords do not match");
            return false;
        }
        var user = {};
        user.email = $.trim($("#remail").val());
        user.password = $("#rpassword").val();
        user.isReceive = $("#isReceive").is(':checked');
        $.ajax({
            type: 'POST',
            url: '/register',
            data: user,
            dataType: 'json',
            success: function(result) {
                console.log(result);
                if (result.status !== "success") {
                    $("#registerMsg").text(result.msg);
                    return;
                }
                $('input[type="text"]').val("");
                $('input[type="password"]').val("");
                jump("#login");
            }
        });
    });
});

$(document).on('pagebeforeshow','#shopcart',function(e, data){
    $("#shopcartBtn").parent().show();
    $("#payment").hide();
    $("#order_info").show();
    $("table tbody").empty();
    $("#paySuccessMsg").empty();
    $("#payMsg").empty();
});

$(document).on('pageshow','#shopcart',function(e, data){
    $.ajax({
        type:'GET',
        url:'/shopcart',
        dataType:'json',
        success:function( result ){
            console.log(result);
            if(result.status === "fail"){
                jump("#login");
                return false;
            }
            if(result.status === "success"){
                var data = result.data.orders;
                var places = result.data.places;
                var tbody = $("table tbody");
                var select = $("#places");
                var total = 0;
                for(var i=0; i<data.length; i++){
                    var html = "<tr><td>"+data[i].product_name+"</td>"
                                +"<td>$"+data[i].product_price+"</td>"
                                +"<td>"+data[i].order_num+"</td>"
                                +"<td>$"+(data[i].product_price * data[i].order_num)+"</td></tr>";
                    tbody.append(html);
                    total += (data[i].product_price * data[i].order_num);
                }

                for(var j=0; j<places.length; j++ ){
                    if( j == 0){
                        var opt = '<option value="'+places[j]._id+'" selected>'+places[j].time +' , '+places[j].address+'</option>';
                    }else{
                        var opt = '<option value="'+places[j]._id+'">'+places[j].time +' , '+places[j].address+'</option>';
                    }
                    select.append(opt);
                }
                $(".ui-select").css("width","100%");
                select.selectmenu( "refresh" );
                $("#shopcartTotal").text(total);


                $("#shopcartBtn").on('click',function(){
                    var place_id = $("#places").val();
                    var order_notes = $("#order_notes").val();
                    $.ajax({
                        type:'POST',
                        url:'/confirm',
                        dataType:'json',
                        data:{
                            place_id:place_id,
                            order_notes:order_notes
                        },
                        success:function( result ){
                            if(result.status === "success"){
                                $("#paySuccessMsg").text("successfully order");
                            }
                        }
                    })
                    $.ajax({
                            type:'GET',
                            url:'/client_token',
                            success:function( result ){
                                if(result.status === "fail"){
                                    jump("#login");
                                    return false;
                                }
                                $("#shopcartBtn").parent().hide();
                                $("#order_info").hide();
                                $("#payment").show();
                                console.log(result);
                                if( result.status !== "success" ){
                                    return false;
                                }
                                var client = new braintree.api.Client({clientToken: result.data });
                                $("#pay").on('click',function(){
                                    var cardNumber = $.trim($("#cardNumber").val());
                                    var cardExpiration = $.trim($("#cardExpiration").val());
                                    var cardCvv = $.trim($("#cardCvv").val());
                                    var place_id = $("#places").val();
                                    var order_notes = $("#order_notes").val();
                                    var options = {};
                                    options.number = cardNumber;
                                    options.expirationDate = cardExpiration;
                                    options.cvv = cardCvv;
                                    client.tokenizeCard(options,function(err,nonce){
                                        if(err){
                                            $("#payMsg").text(err);
                                            return false;
                                        }
                                        $.ajax({
                                            type:'POST',
                                            url:'/payment',
                                            data:{
                                                payment_method_nonce:nonce,
                                                amount:total,
                                                place_id:place_id,
                                                order_notes:order_notes
                                            },
                                            success:function( result ){
                                                console.log( result );
                                                if(result.status === "fail"){
                                                    jump("#login");
                                                    return false;
                                                }
                                                if(result.success === true){
                                                    $("#payment").hide();
                                                    $("#paySuccessMsg").text("pay successfully, Thanks for your business");                                                    
                                                    return;
                                                }
                                                $("#payMsg").text("failed to pay");
                                            }
                                        })
                                    });
                                });
                            }
                        })
                });
            }
        }
    })
});

$(document).on('pageshow','#history',function(e, data){
    $.ajax({
        type:'GET',
        url:'/orders',
        dataType:'json',
        success:function( result ){
            console.log(result);
            if(result.status === "fail"){
                jump("#login");
                return false;
            }
            if(result.status === "success"){
                var data = result.data;
                var tbody = $("table tbody");
                var total = 0;
                for(var i=0; i<data.length; i++){
                    var html = "<tr><td>"+data[i].product_name+"</td>"
                                +"<td>"+data[i].order_num+"</td>"
                                +"<td>"+data[i].order_status+"</td>"
                                +"<td>"+$.format.date(data[i].order_date,"dd/MM/yyyy HH:mm:ss")+"</td></tr>";
                    tbody.append(html);
                }
            }
        }
    })
});