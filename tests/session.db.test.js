const path = require("path");
const {Pool} = require("pg");
const create = require("../database/create.js");
const user = require("../database/user.js");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

const SCHEMA = "test_schema_session";
const pool = new Pool();

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

test("register, insert session, remove", async ()=>{
  const USER = ['test_session@gmail.com', 'abcde'];
  const client = await pool.connect();
  const ID = (await client.query(user.registerUser, USER)).rows[0].user_id;
  await client.query(user.insertSession, [ID, 'something', 1000]);
  const {token_value: tokenValue, expiry} = (await client.query(user.getSession, [ID])).rows[0];
  await client.query(user.rmSession, [ID]);
  const empty = (await client.query(user.getSession, [ID])).rows;
  client.release();
  expect(tokenValue).toBe('something');
  expect(expiry).toBe("1000");
  expect(empty).toEqual([]);

  

})

test("insert session without registration", async()=>{
  expect.assertions(1);
  const USER = ['test_session2@gmail.com', 'abcde'];
  const client = await pool.connect();
  try {
    await client.query(user.insertSession, [100, 'somethingelse', 1000])
  } catch(e) {
    expect(e).toBeDefined();
  } finally {
    client.release();
  };
})

test("insert session with duplicate token", async()=>{
  expect.assertions(1);
  const client = await pool.connect();
  const USER3 = ['test_session3@gmail.com', 'abcde'];
  const USER4 = ['test_session4@gmail.com', 'abcde'];
  const ID3 = (await client.query(user.registerUser, USER3)).rows[0].user_id;
  const ID4 = (await client.query(user.registerUser, USER4)).rows[0].user_id;
  await client.query(user.insertSession, [ID3, 'tokenUser3', 1000])
  try {
    await client.query(user.insertSession, [ID4, 'tokenUser3', 1000])
  } catch(e) {
    expect(e).toBeDefined();
  } finally {
    client.release()
  };
})