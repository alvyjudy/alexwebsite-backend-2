//turn off logging: 
console.log = () =>{}

const pool = require("../server/db.js");
const create = require("../database/create.js");
const user = require("../database/user.js");

const path = require("path");
const ENVFILE = process.env.TESTENV === "cloud" ? ".env.cloud" : ".env.local"
require("dotenv").config({path:path.resolve(path.dirname(__filename), ENVFILE)});

const SCHEMA = "test_schema_tokenstore";
const cachedTokens = require("../server/cachedTokens.js");
const verifyToken = require("../server/tokenStore.js").verifyToken;

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
  pool.end();
})

describe("token exists in cache", ()=>{
  const USER = ['test.token.store@gmail.com', 'abc'];
  let USERID;
  let TOKEN;

  beforeEach(async ()=>{
    USERID = (await pool.query(user.registerUser, USER)).rows[0].user_id;
    TOKEN = {userID: USERID, tokenValue: "abcde", expiry: Date.now() + 10000}
    cachedTokens.add(TOKEN)
  })

  afterEach(async ()=>{
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [USERID])
    cachedTokens.flush();
  })


  test("correct token", async ()=>{
    const result = await verifyToken(TOKEN.tokenValue, TOKEN.userID)
    expect(result).toBe(true);
  })

  test('token not in database', async ()=>{
    const result = (await pool.query(user.getSession, [USERID])).rows;
    expect(result).toEqual([]);
  })

  test("incorrect token", async ()=>{
    const result = await verifyToken('random value', TOKEN.userID)
    expect(result).toBe(false)
  })
})

describe("token does not exist in cache", ()=>{
  const USER = ['test.token.store2@gmail.com', 'abc'];
  let USERID;
  let TOKEN;

  beforeEach(async ()=>{
    USERID = (await pool.query(user.registerUser, USER)).rows[0].user_id;
    TOKEN = {userID: USERID, tokenValue: "abcde", expiry: Date.now() + 10000}
    await pool.query(user.insertSession, Object.values(TOKEN))
  })

  afterEach(async ()=>{
    cachedTokens.flush();
    await pool.query(user.rmSession, [USERID]);
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [USERID]);
  })

  test("token cache should be empty", ()=>{
    expect(cachedTokens.tokens).toEqual([])
  })

  test("correct token", async () => {
    const result = await verifyToken(TOKEN.tokenValue, TOKEN.userID);
    expect(result).toBe(true);
  })

  test("incorrect token", async () => {
    const result = await verifyToken("whatever", TOKEN.userID);
    expect(result).toBe(false);
  })

})

describe("token does not exist in cache and has expired", ()=>{
  const USER = ['test.token.store3@gmail.com', 'abc'];
  let USERID;
  let TOKEN;

  beforeAll(async ()=>{
    USERID = (await pool.query(user.registerUser, USER)).rows[0].user_id;
    TOKEN = {userID: USERID, tokenValue: "abcde", expiry: Date.now() - 10000}
    await pool.query(user.insertSession, Object.values(TOKEN));
  })

  afterAll(async ()=>{
    cachedTokens.flush();
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [USERID]);
  })

  test("token cache should be empty", ()=>{
    expect(cachedTokens.tokens).toEqual([])
  })

  test("correct but expired token", async () => {
    const result = await verifyToken(TOKEN.tokenValue, USERID)
    expect(result).toBe(false)
  })
  
  test("empty token in db", async ()=>{
    const empty = (await pool.query(user.getSession, [USERID])).rows;
    expect(empty).toEqual([])
  })
    
  })

