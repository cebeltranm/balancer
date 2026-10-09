const cors = require("cors");
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const DEV_AUTH_TOKEN = "balancer-local-dev-token";
const TMP_DIR = path.join(__dirname, "..", ".tmp");

// Development-only: make sure the (git-ignored) storage folder exists.
function ensureTmpDir() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));

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
    ensureTmpDir();
    const files = fs.readdirSync(TMP_DIR);
    const data = files.map((file) => ({
      name: file,
      lastModified: fs.statSync(TMP_DIR + "/" + file).mtime,
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
  try {
    ensureTmpDir();
  } catch (err) {
    console.log(err);
    return res.status(500).send(JSON.stringify(err)).end();
  }
  fs.writeFile(TMP_DIR + req.path, JSON.stringify(req.body), function (err) {
    console.log("Saved file ", req.path);
    if (err) {
      console.log(err);
      return res.status(500).send(JSON.stringify(err)).end();
    }
    res.status(200).end();
  });
});

// Anything put in the public folder is available to the world!
app.use(requireAuth, express.static(TMP_DIR));
ensureTmpDir();
app.listen(port, function () {
  console.log("Listening on port: ".concat(port));
});
