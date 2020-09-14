
const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), "./.env")})

const app = require("../server/app.js");
app.listen(3002);