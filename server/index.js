var cors = require('cors');
var express = require('express');
var fs = require('fs');
var app = express();


app.use(cors());
app.use(express.json());

var port = 8181;
// app.get('/', function (request, response) {
//     console.log(request);
//     response.sendFile(__dirname + '/..');
// });

app.post(/\/.*\.json$/, function (req, res) {
    fs.writeFile(__dirname + '/../config'+req.path, JSON.stringify(req.body), function (err) {
        if (err) {
            res.send(500, JSON.stringify(err))
            return console.log(err);
        }
        res.send(200, 'ok')
    });
});

// Anything put in the public folder is available to the world!
app.use(express.static(__dirname + '/../config'));
app.listen(port, function () {
    console.log("Listening on port: ".concat(port));
});
