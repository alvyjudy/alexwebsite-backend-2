const pool = require("../server/db.js");
const path = require("path");
const ENVFILE = process.env.TESTENV === "cloud" ? ".env.cloud" : ".env.local"
require("dotenv").config({path:path.resolve(path.dirname(__filename), ENVFILE)});

if (ENVFILE === ".env.local") {
  console.log("Using local PostgreSQL for database connection")
} else if (ENVFILE === ".env.cloud") {
  console.log("Using cloud SQL for database connection")
} else {
  throw Error("Environment variable TESTENV received invalid input")
}

test("database connection", async ()=>{
  await pool.query(`SELECT NOW()`).then(res=>{
    expect(res.rows[0]).toBeDefined()
    pool.end()
  })
})