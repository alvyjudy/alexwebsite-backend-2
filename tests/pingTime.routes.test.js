const pool = require("../server/db.js");
const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});
const create = require("../database/create.js");
const SCHEMA = "test_schema_auth_register_user_unit";
const axios = require("./axios.js");
const {createHttpTerminator} = require("http-terminator");

const app = require("../server/app.js");
const server = app.listen();
const ENDPOINT = "http://localhost:" + server.address().port;
const httpTerminator = createHttpTerminator({server});

beforeAll(async ()=>{
  const client = await pool.connect();
  client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  client.query(`CREATE SCHEMA ${SCHEMA};`);
  client.query(`SET search_path TO ${SCHEMA};`);

  Object.values(create).forEach(
    (action) => {
      client.query(action)
    }
  )
  await client.release();
})

afterAll(async ()=>{
  await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  httpTerminator.terminate();
  pool.end();
})

describe("test set up", ()=>{
  test("ping", async ()=>{
    res = await axios({
      method: 'get',
      url: ENDPOINT + "/ping",
      data: {
        email: USER1.email,
        password: USER1.password
      }
    })
    expect(res.status).toBe(200);
    expect(res.data).toBe("Hello world");
  })

  test("time", async ()=>{
    res = await axios({
      method: 'get',
      url: ENDPOINT + "/time",
      data: {
        email: USER1.email,
        password: USER1.password
      }
    })
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();
  })
})