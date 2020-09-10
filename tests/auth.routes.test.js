const pool = require("../server/db.js");
const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});
const create = require("../database/create.js");
const SCHEMA = "test_schema_auth_register_user_unit";
const axios = require("./axios.js");
const {createHttpTerminator} = require("http-terminator");

const USER1 = {email: 'user1@yahoo.com', password: 'abcdefg'}
const USER2 = {email: 'user2@yahoo.com', password: 'ddddd'}

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

describe("test register route", ()=>{
  test("register user", async ()=>{
    res = await axios({
      method:'post',
      url: ENDPOINT + '/register',
      data: {
        email: USER1.email,
        password: USER1.password
      }
    })
    userID = res.data
    expect(userID).toBeDefined();
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [userID])
    const empty = (await pool.query(`SELECT * FROM auth WHERE user_id = $1;`, [userID])).rows
    expect(empty).toEqual([])
  })
})

describe("test login route", ()=>{
  let userID;

  beforeAll(async ()=>{
    const res = await axios({
      method:'post',
      url: ENDPOINT + '/register',
      data: {
        email: USER1.email,
        password: USER1.password
      }
    })
    userID = res.data
  })

  afterAll(async()=>{
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [userID])
  })

  test("",async ()=>{
    const res = await axios({
      method:'post',
      url: ENDPOINT + '/login',
      headers: {"Content-Type":"application/json"},
      data: {
        email: USER1.email,
        password: USER1.password
      }
    })
    const tokenValue = res.data
    expect(tokenValue).toBeDefined();
  })
})

describe("test check-token route", ()=>{
  let userID;
  let tokenValue;

  beforeAll(async ()=>{
    const registerRes = await axios({
      method:'post',
      url: ENDPOINT + '/register',
      data: {
        email: USER1.email,
        password: USER1.password
      }
    })
    userID = registerRes.data
    const loginRes = await axios({
      method:'post',
      url: ENDPOINT + '/login',
      headers: {"Content-Type":"application/json"},
      data: {
        email: USER1.email,
        password: USER1.password
      }})
    tokenValue = loginRes.data
  })

  afterAll(async()=>{
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [userID])
  })

  test("",async ()=>{
    const res = await axios({
      method: 'post',
      url: ENDPOINT + '/check-token',
      headers: {
        "Content-Type":"application/json",
        "tokenValue":tokenValue,
        "userID": userID
        }
    }); 
    expect(res.status).toBe(200);
    expect(res.data).toBe("Valid token")
  })
})
