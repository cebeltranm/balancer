var cors = require('cors');
var express = require('express');
var fs = require('fs');
var app = express();


app.use(cors());
app.use(express.json());

var port = 8181;
app.get('/_ping', function (request, response) {
    console.log('ping');
    response.send(200, 'ok');
});

app.post(/\/.*\.json$/, function (req, res) {
    fs.writeFile(__dirname + '/../.tmp'+req.path, JSON.stringify(req.body), function (err) {
        console.log('Saved file ', req.path);
        if (err) {
            console.log(err);
            return res.send(500, JSON.stringify(err));
        }
        res.send(200);
    });
});

// Anything put in the public folder is available to the world!
app.use(express.static(__dirname + '/../.tmp'));
app.listen(port, function () {
    console.log("Listening on port: ".concat(port));
});
