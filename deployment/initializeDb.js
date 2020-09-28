const path = require("path");
require("dotenv").config({path:path.resolve(__dirname, ".env")})
const pool = require("../server/db");
const create = require("../database/create");

const SCHEMA = process.env.SCHEMA;

const init = async () => {
  const client = await pool.connect()
  client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  client.query(`CREATE SCHEMA ${SCHEMA};`);
  client.query(`SET search_path TO ${SCHEMA};`);
  Object.values(create).forEach(
    action=>{
      client.query(action)
    }
  )
  await client.query(`SELECT NOW();`)
  client.release()
  pool.end();
  console.log(`Database initialized`)
}

init()