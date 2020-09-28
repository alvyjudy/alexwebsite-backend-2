const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), "./.env")})

const SCHEMA = process.env.SCHEMA;
const app = require("../server/app.js");
const pool = require("../server/db");

const start = async () =>{
  await pool.query(`SET search_path TO ${SCHEMA}`)
  const port = process.env.SERVEPORT
  app.listen(port, ()=>{console.log(`Server listening on ${port}`)});
}

start()
