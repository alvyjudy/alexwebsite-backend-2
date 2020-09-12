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


describe("test register route", ()=>{
  const USER = {
    email: 'hello@gmail.com',
    password: '1234'
  }

  test("register user", async ()=>{
    res = await axios({
      method:'post',
      url: ENDPOINT + '/register',
      data: {
        email: USER.email,
        password: USER.password
      }
    })
    userID = res.data
    expect(userID).toBeDefined();
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [userID])
    const empty = (await pool.query(`SELECT * FROM auth WHERE user_id = $1;`, [userID])).rows
    expect(empty).toEqual([])
  })
})

describe.only("test login route", ()=>{
  //precondition: test register route must succeed
  let userID;
  const USER = {
    email: 'hello@gmail.com',
    password: '1234'
  }

  beforeAll(async ()=>{
    const res = await axios({
      method:'post',
      url: ENDPOINT + '/register',
      data: {
        email: USER.email,
        password: USER.password
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
        email: USER.email,
        password: USER.password
      }
    })
    const tokenValue = res.data
    expect(tokenValue).toBeDefined();
  })
})

describe("test check-token route", ()=>{
  const USER = {
    email: 'hello@gmail.com',
    password: '1234'
  }

  let userID;
  let tokenValue;

  beforeAll(async ()=>{
    const registerRes = await axios({
      method:'post',
      url: ENDPOINT + '/register',
      data: {
        email: USER.email,
        password: USER.password
      }
    })
    userID = registerRes.data
    const loginRes = await axios({
      method:'post',
      url: ENDPOINT + '/login',
      headers: {"Content-Type":"application/json"},
      data: {
        email: USER.email,
        password: USER.password
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
        "Token-Value":tokenValue,
        "User-ID": userID
        }
    }); 
    expect(res.status).toBe(200);
    expect(res.data).toBe("Valid token")
  })
})
