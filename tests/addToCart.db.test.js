//turn off logging: 
console.log = () =>{}

const path = require("path");
const {Pool} = require("pg");
const create = require("../database/create.js");
const user = require("../database/user.js");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

const SCHEMA = "test_schema_addToCart";
let USER_ID;
const USER = ['test_addToCart@gmail.com', '123']

const pool = new Pool();

beforeAll(async ()=>{
  const client = await pool.connect();
  client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  client.query(`CREATE SCHEMA ${SCHEMA};`);
  client.query(`SET search_path TO ${SCHEMA}`);
  Object.values(create).forEach(
    (action) => {client.query(action);}
  ) 
  client.query(user.registerUser, USER)
  USER_ID = (await client.query(user.loginUser, USER)).rows[0].user_id;
  console.log(USER_ID);
  await client.release();
})

afterAll(async ()=>{
  const client = await pool.connect();
  await client.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`);
  await client.release();
  pool.end();
})


test("add items to cart then remove", async ()=>{
  const itemsToInsert = [
    [USER_ID, 1, 1],
    [USER_ID, 2, 3],
    [USER_ID, 3, 2]
  ]
  const itemsAfterInsert = [
    { item_id: 1, count: 1 },
    { item_id: 2, count: 3 },
    { item_id: 3, count: 2 }
  ]
  const client = await pool.connect();
  itemsToInsert.forEach(item=>{
    client
      .query(user.addItemToCart, item)
      .then(()=>{console.log("Inserted", item)})
  })

  const userCart = (await client.query(user.getUserCart, [USER_ID])).rows;
  [1,2,3].forEach(
    (item)=>{
      client.query(user.removeItemFromCart, [item])
  })
  const userCart2 = (await client.query(user.getUserCart, [USER_ID])).rows;
  client.release()
  expect(userCart).toEqual(itemsAfterInsert);
  expect(userCart2).toEqual([]);
})