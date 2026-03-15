const cors = require("cors");
const express = require("express");
const fs = require("fs");
const app = express();
const DEV_AUTH_TOKEN = "balancer-local-dev-token";

app.use(cors());
app.use(express.json());

const port = 8181;
function isAuthorized(request) {
  const header = request.headers.authorization || "";
  return header === `Bearer ${DEV_AUTH_TOKEN}`;
}

function requireAuth(request, response, next) {
  if (!isAuthorized(request)) {
    return response.status(401).json({ error: "Unauthorized" }).end();
  }
  next();
}

app.get("/_ping", function (request, response) {
  console.log("ping");
  response.status(200).end();
});

app.post("/auth/login", function (_request, response) {
  response.status(200).json({ token: DEV_AUTH_TOKEN }).end();
});

app.get("/auth/session", requireAuth, function (_request, response) {
  response.status(200).json({ ok: true }).end();
});

app.get("/list", requireAuth, function (request, response) {
  console.log("list");
  try {
    const files = fs.readdirSync(__dirname + "/../.tmp");
    const data = files.map((file) => ({
      name: file,
      lastModified: fs.statSync(__dirname + "/../.tmp/" + file).mtime,
    }));
    response.setHeader("Content-Type", "application/json");
    return response.status(200).send(JSON.stringify(data)).end();
  } catch (err) {
    console.error(err);
    response.setHeader("Content-Type", "application/json");
    return response.status(500).send(JSON.stringify(err)).end();
  }
});

app.post(/\/.*\.json$/, requireAuth, function (req, res) {
  fs.writeFile(
    __dirname + "/../.tmp" + req.path,
    JSON.stringify(req.body),
    function (err) {
      console.log("Saved file ", req.path);
      if (err) {
        console.log(err);
        return res.status(500).send(JSON.stringify(err)).end();
      }
      res.status(200).end();
    },
  );
});

// Anything put in the public folder is available to the world!
app.use(requireAuth, express.static(__dirname + "/../.tmp"));
app.listen(port, function () {
  console.log("Listening on port: ".concat(port));
});
