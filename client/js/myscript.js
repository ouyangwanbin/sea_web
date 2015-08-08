$(document).bind('mobileinit', function() {
    $.mobile.loader.prototype.options.text = "loading";
    $.mobile.loader.prototype.options.textVisible = false;
    $.mobile.loader.prototype.options.theme = "a";
    $.mobile.loader.prototype.options.html = "";
});
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

$(document).on('pageshow', '#home', function(e, data) {
    $.ajax({
        method: 'GET',
        url: '/products',
        dataType: 'json',
        success: function(result) {
            console.log(result);
            if (!result) {
                console.log("error");
                return;
            }
            if (result.status !== "success") {
                console.log("faild to load data");
                return;
            }
            var products = result.data;
            $("#products").empty();
            for (var i = 0; i < products.length; i++) {
                var productHtml = '<div class="ui-block-a" style="margin-top:10px;"><div class="ui-body ui-body-d ui-corner-all ui-shadow"><h2 class="ui-btn-left">' + products[i].name + '</h2><label for="price" class="ui-btn-right">$' + parseFloat(products[i].price).toFixed(2) + '/lb</label><input type="button" value="order"/></div></div>';
                $("#products").append(productHtml);
            }
            $("#home").trigger("pagecreate");
        }
    });
});
