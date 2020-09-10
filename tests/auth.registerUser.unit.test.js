const pool = require("../server/db.js");
const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});
const create = require("../database/create.js");
const user = require("../database/user.js")
const auth = require("../server/auth.js");
const cachedTokens = require("../server/cachedTokens.js");

const USER1 = {
  email: 'user1@gmail.com', 
  password: 'abcd',
  id: undefined,
  token: undefined
}

const reqMock = (email, password, tokenValue, tokenExpiry, userID) => {
  const reqObj = {
    body: {email, password},
    tokenValue,
    tokenExpiry,
    userID,
    get: (field)=>reqObj[field]
  }
  return reqObj
}

const resMock = () => {
  const send = jest.fn((userID) => {resObj.userID=userID})
  const resObj = {
    status: jest.fn(() => {return {send}}),
    send,
    userID: undefined
  }
  return resObj
}

const nextMock = () => jest.fn(()=>{})

const SCHEMA = "test_schema_auth_register_user_unit";

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
  pool.end();
})

describe("register user", ()=>{
  req = reqMock(USER1.email, USER1.password)
  res = resMock();
  next = nextMock();

  afterAll(async ()=>{
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [req.userID])
  })

  test("", async ()=>{
    expect(req.userID).toBeUndefined();
    await auth.registerUser()(req, res, next);
    const userID = res.userID;
    expect(next).toHaveBeenCalledTimes(0);
    expect(res.status).toHaveBeenCalledWith(200);
    
    expect(res.send).toHaveBeenCalledWith(userID);
  })
  

})