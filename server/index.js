var cors = require('cors');
var express = require('express');
var app = express();

app.use(cors());

var port = 8181;
app.get('/', function (request, response) {
    console.log(request);
    response.sendFile(__dirname + '/..');
});
// Anything put in the public folder is available to the world!
app.use(express.static(__dirname + '/../config'));
app.listen(port, function () {
    console.log("Listening on port: ".concat(port));
});
