const pool = require("../server/db.js");
const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});
const create = require("../database/create.js");
const user = require("../database/user.js")
const auth = require("../server/auth.js");
const cachedTokens = require("../server/cachedTokens.js");

const USER1 = {
  cred: ['user1@gmail.com', 'abcd'],
  id: undefined,
  token: undefined
}

const USER2 = {
  cred: ['user2@gmail.com', 'abcd'],
  id: undefined,
  token: undefined
}

const USER3 = {
  cred: ['user3@gmail.com', 'abcd'],
  id: undefined,
  token: undefined
}

const reqMock = (valuePair) => {
  const {email, 
    password, 
    tokenValue, 
    tokenExpiry, 
    userID,
    cartItems
  } = valuePair;

  const get = (field) => {
    return reqObj.headers[field]
  }

  const reqObj = {
    body:{
      email: email,
      password: password,
      cartItems
    },
    headers:{
      "Token-Value": tokenValue,
      "User-ID": userID,
      "Content-Type": "application/json"
    },
    get
  }
  
  return reqObj
}

const resMock = () => {
  const send = jest.fn(() => {})
  return {
    status: jest.fn(() => {return {send}}),
    send
  }
}

const nextMock = () => jest.fn(()=>{})

const SCHEMA = "test_schema_auth_unit";


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

  USER1.userID = (await client.query(user.registerUser, USER1.cred)).rows[0].user_id
  USER2.userID = (await client.query(user.registerUser, USER2.cred)).rows[0].user_id
  USER3.userID = (await client.query(user.registerUser, USER3.cred)).rows[0].user_id
  await client.release();
})

afterAll(async ()=>{
  await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  pool.end();
})



test("test mock", async ()=>{
  const next = nextMock();
  next();
  expect(next).toHaveBeenCalledTimes(1);
})

test("check id", ()=>{
  expect(USER1.userID).toBe(1);
  expect(USER2.userID).toBe(2);
  expect(USER3.userID).toBe(3);
})




describe("test verifyEmailPw", ()=>{
  test("user 1, correct email, correct password", async ()=>{
    const req = reqMock({
      email: USER1.cred[0], 
      password: USER1.cred[1]
    })
    const res = resMock();
    const next = nextMock();
    await auth.verifyEmailPw()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.get("User-ID")).toBe(USER1.userID);
  })

  test("user 1, correct email, incorrect password", async ()=>{
    const req = reqMock({
      email: USER1.cred[0], 
      password: "random"
    })
    const res = resMock();
    const next = nextMock();
    await auth.verifyEmailPw()(req, res, next);
    expect(next).toHaveBeenCalledTimes(0);
    
  })
})

describe("user1, test setToken", ()=>{
  afterEach(async () => {
    await pool.query(user.rmSession, [USER1.userID])
  })

  test("set token", async () => {
    const req = reqMock({userID: USER1.userID});
    const res = resMock();
    const next = nextMock();
    await auth.setToken()(req, res, next);
    expect(req.get("Token-Value")).toBeDefined();
    const {token_value: tokenValue, expiry: tokenExpiry} = (
      await pool.query(user.getSession, [USER1.userID])
    ).rows[0] 
    expect(tokenValue).toBe(req.get("Token-Value").toString());
  })
})

test("mock res", ()=>{
    const res = resMock();
    res.status(403).send('hello');
    res.send('hi')
    res.status(403)
    expect(res.status).toHaveBeenCalledTimes(2);
    expect(res.send).toHaveBeenCalledTimes(2);
})

describe("test verifyToken, valid token", ()=>{
  const req = reqMock({
    email: USER1.cred[0], 
    password: USER1.cred[1]})

  beforeAll(async () =>{
    const next = nextMock();
    const res = resMock();
    await auth.verifyEmailPw()(req, res, next);
    console.log(req);
    await auth.setToken()(req, res, next);
  })


  test("", async () =>{
    const res = resMock();
    const next = nextMock();
    await auth.verifyToken()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledTimes(0);
    expect(res.send).toHaveBeenCalledTimes(0);
  })
})

describe("test verifyToken, inexistent token", ()=>{
  const req = reqMock({
    email: USER2.cred[0], 
    password: USER2.cred[1]})
  

  beforeAll(async () =>{
     const next = nextMock();
     const res = resMock();
     await auth.verifyEmailPw()(req, res, next);
     await auth.setToken()(req, res, next);
     req.headers["Token-Value"] = undefined
   })

   afterAll(async ()=>{
    await pool.query(user.rmSession, [USER2.userID]);
   })


  test("", async () =>{
    expect(1).toBe(1);
    const res = resMock();
    const next = nextMock();
    await auth.verifyToken()(req, res, next)

    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("token header not included");
  })
})

describe("test verifyToken, invalid token", ()=>{
  const req = reqMock({
    email: USER2.cred[0], password: USER2.cred[1]})
  

  beforeAll(async () =>{
     const next = nextMock();
     const res = resMock();
     await auth.verifyEmailPw()(req, res, next);
     await auth.setToken()(req, res, next);
     req.headers["Token-Value"] = "randomvalue"
   })

   afterAll(async () =>{
    await pool.query(user.rmSession, [USER2.userID])
   })


  test("", async () =>{
    expect(1).toBe(1);
    const res = resMock();
    const next = nextMock();
    await auth.verifyToken()(req, res, next)
    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("invalid or expired token");
  })
})