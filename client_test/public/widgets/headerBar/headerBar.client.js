var model = {
    Customer: {
        Name: "Some Customer"
    }
};

//testing...
$(function() {
    debugger;
    $("#headerBarTmpl")
        .tmpl(model)
        .appendTo("#app_headerBarContainer"); 
});
