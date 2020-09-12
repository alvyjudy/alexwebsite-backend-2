//turn off logging: 
console.log = () =>{}

const axios = require('axios');
const {createHttpTerminator} = require("http-terminator");
const create = require("../database/create.js");
const user = require("../database/user.js");
const path = require("path");


require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});
const app = require("../server/app.js");
const pool = require("../server/db.js");
const server = app.listen();
const httpTerminator = createHttpTerminator({server});
const ENDPOINT = "http://localhost:" + server.address().port;
const SCHEMA = "test_setup";

beforeAll(async ()=>{
  const client = await pool.connect();
  client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  client.query(`CREATE SCHEMA ${SCHEMA};`);
  client.query(`SET search_path TO ${SCHEMA}`);
  Object.values(create).forEach(
    (action) => {client.query(action);}
  ) 
  await client.release();
})

afterAll(async ()=>{
  const client = await pool.connect();
  await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  await client.release();
  httpTerminator.terminate();
  pool.end()
})

test("", async ()=>{
  const res = (await axios.get(ENDPOINT + "/time"))
  const status = res.status;
  const data = res.data;
  console.log(status, data);
})

