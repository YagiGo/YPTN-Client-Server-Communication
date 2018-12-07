// Get the page render and saved as HTML
var page = require('webpage').create();
var fs = require('fs');
var exec = require("child_process").exec, child;  // Run exec within JS
page.open('https://www.somesite.com/page.aspx', function () {
    page.evaluate(function(){

    });

    page.render('export.png');
    fs.write('1.html', page.content, 'w');
    phantom.exit();
});