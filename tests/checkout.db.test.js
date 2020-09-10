const path = require("path");
const {Pool} = require("pg");
const create = require("../database/create.js");
const user = require("../database/user.js");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

const SCHEMA = "test_schema_checkout";
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

test('1 user placing 1 order', async ()=>{
  const client = await pool.connect();
  const USER = ['test_checkout@gmail.com', '123'];
  let USER_ID;
  let ORDER_ID;
  let ORDER;
  let ITEMS;
  
  USER_ID = (await client.query(user.registerUser, USER)).rows[0].user_id;
  ORDER = [USER_ID, "1 Bloor St", "1haiwnx"];
  ORDER_ID = (await client.query(user.createOrder, ORDER)).rows[0].order_id;
  ITEMS = [
    [1, ORDER_ID, 2],
    [2, ORDER_ID, 4],
    [9, ORDER_ID, 1]
  ];


  ITEMS.forEach(item=>{
    client.query(user.addItemToOrder, item);
  })

  let itemsInOrder = []
  const orderDetail = (await client.query(user.getOrderDetail, [ORDER_ID])).rows;
  orderDetail.forEach(item=>{
    itemsInOrder.push([item.item_id, ORDER_ID, item.count])
  })
  const userOrderInfo = Object.values(orderDetail[0]).slice(0,3);

  client.query(user.rmOrder, [ORDER_ID]);
  const emptyOrder = (await client.query(user.getOrderDetail, [ORDER_ID])).rows;
  expect(userOrderInfo).toEqual(ORDER);
  expect(itemsInOrder).toEqual(ITEMS);
  expect(emptyOrder).toEqual([])
  await client.release();
})