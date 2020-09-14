//turn off logging: 
console.log = () =>{}

const pool = require("../server/db.js");
const path = require("path");
const ENVFILE = process.env.TESTENV === "cloud" ? ".env.cloud" : ".env.local"
require("dotenv").config({path:path.resolve(path.dirname(__filename), ENVFILE)});
const create = require("../database/create.js");
const user = require("../database/user.js")
const auth = require("../server/auth.js");
const {getMockRes: resMock} = require('@jest-mock/express')


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
  await client.release();
})

afterAll(async ()=>{
  await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  pool.end();
})


describe("test verifyEmailPw middleware", ()=>{
  const USER = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    userID: undefined,
    token: undefined
  }

  beforeEach(async()=>{
    //register user
    await pool
      .query(user.registerUser, [USER.email, USER.password])
      .then(res=>{
        USER.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER.userID)
      })
      .catch(e=>{console.log("User registration failed:", e)})
  })

  afterEach(async ()=>{
    await pool
    .query(`DELETE FROM auth WHERE user_id = $1`, [USER.userID])
    .then(()=>{
      USER1.userID = undefined
      console.log("userID cleared:", USER1.userID)
    })
    .catch(e=>{console.log("delete user auth failed")})

  await pool
    .query(`SELECT * FROM auth;`)
    .then(res=>{console.log("auth table should be empty:", res.rows)})

  })

  test("user 1, correct email, correct password", async ()=>{
    const req = reqMock({
      email: USER.email,
      password: USER.password
    })
    const {res, next} = resMock();
    await auth.verifyEmailPw()(req, res, next);//TEST!
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userID).toBe(USER.userID);
  })

  test("user 1, correct email, incorrect password", async ()=>{
    const req = reqMock({
      email: USER.email,
      password: "random"
    })
    const {res, next} = resMock();
    await auth.verifyEmailPw()(req, res, next);
    expect(next).toHaveBeenCalledTimes(0);
    
  })
})

describe("user1, test setToken middleware", ()=>{
  const USER = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    userID: undefined,
    token: undefined
  }

  beforeEach(async()=>{
    //register user
    await pool
      .query(user.registerUser, [USER.email, USER.password])
      .then(res=>{
        USER.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER.userID)
      })
      .catch(e=>{console.log("User registration failed:", e)})
  })

  afterEach(async ()=>{
    await pool
    .query(`DELETE FROM auth WHERE user_id = $1`, [USER.userID])
    .then(()=>{
      USER1.userID = undefined
      console.log("userID cleared:", USER1.userID)
    })
    .catch(e=>{console.log("delete user auth failed")})

  await pool
    .query(`SELECT * FROM auth;`)
    .then(res=>{console.log("auth table should be empty:", res.rows)})

  })


  test("set token", async () => {
    const req = reqMock({})
    req.userID = USER.userID
    const {res, next} = resMock();
    await auth.setToken()(req, res, next); //TEST middleware

    const {token_value: tokenValue, expiry: tokenExpiry} = (
      await pool.query(user.getSession, [USER.userID])
    ).rows[0] 
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(tokenValue.toString())
  })
})


describe("test verifyToken middleware", ()=>{
  const USER = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    userID: undefined,
    tokenValue: undefined
  }

  beforeEach(async()=>{
    //register user and obtain ID
    await pool
      .query(user.registerUser, [USER.email, USER.password])
      .then(res=>{
        USER.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER.userID)
      })
      .catch(e=>{console.log("User registration failed:", e)})

    //insert a session and obtain token
    await pool
      .query(user.insertSession, [USER.userID, "1234", Date.now()+100000])
      .then(()=>{USER.tokenValue = "1234"})
  })

  afterEach(async ()=>{
    await pool
    .query(`DELETE FROM auth WHERE user_id = $1`, [USER.userID])
    .then(()=>{
      USER1.userID = undefined
      console.log("userID cleared:", USER1.userID)
    })
    .catch(e=>{console.log("delete user auth failed")})

  await pool
    .query(`SELECT * FROM auth;`)
    .then(res=>{console.log("auth table should be empty:", res.rows)})

  })

  test("valid token", async () =>{
    const req = reqMock({
      tokenValue: USER.tokenValue,
      userID: USER.userID
    });
    const {res, next} = resMock();
    await auth.verifyToken()(req, res, next); //test middleware
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledTimes(0)
    expect(res.send).toHaveBeenCalledTimes(0);
  })

  test("inexistent token", async()=>{
    const req = reqMock({
      userID: USER.userID
    });
    const {res, next} = resMock();
    await auth.verifyToken()(req, res, next); //test middleware
    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.send).toHaveBeenCalledWith("Token header not included")

  })

  test("invalid token", async()=>{
    const req = reqMock({
      userID: USER.userID,
      tokenValue: "random"
    });
    const {res, next} = resMock();
    await auth.verifyToken()(req, res, next); //test middleware
    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.send).toHaveBeenCalledWith("invalid or expired token")
  })

  test("forget to include userID", async()=>{
    const req = reqMock({
      tokenValue: USER.tokenValue
    });
    const {res, next} = resMock();
    await auth.verifyToken()(req, res, next); //test middleware
    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.send).toHaveBeenCalledWith("userID not included in header")
  })

})