const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

const pool = require("../server/db.js");
const create = require("../database/create.js");
const axios = require("./axios.js");
const {createHttpTerminator} = require("http-terminator");
const app = require("../server/app.js");
const { addItemToCart } = require("../database/user.js");


const SCHEMA = "schema_shop_routes_test";
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

describe("test get-user-cart & update-user-cart route", ()=>{
  //turn off logging: console.log = ()=>{}
  const USER = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    userID: undefined,
    tokenValue: undefined,
    itemSetOne: [
      {itemID: 1, count: 3},
      {itemID: 2, count: 1}, 
      {itemID: 3, count: 3},
      {itemID: 4, count: 3}, 
    ],
    itemSetTwo: [
      {itemID: 1, count: 3}, 
      {itemID: 2, count: 4}, 
      {itemID: 30, count: 1}, 
    ]
  }

  beforeEach(async()=>{
    //register
    USER.userID = (await axios({
      method: 'post', 
      url: ENDPOINT + '/register',
      headers: {"Content-Type":"application/json"},
      data: {
        email: USER.email,
        password: USER.password
      } 
    })).data
    console.log(USER.userID);
    //login and get token
    USER.tokenValue = (await axios({
      method: 'post',
      url: ENDPOINT + '/login',
      headers:{'Content-Type':'application/json'},
      data:{
        email:USER.email,
        password:USER.password
      }
    })).data
    console.log(USER.tokenValue)

    
  })
  afterEach(async () =>{
    //remove registration
    await pool.query(`DELETE FROM auth WHERE user_id = $1`, [USER.userID])
    await pool.query(`SELECT * FROM auth;`)
    .then(res=>{console.log("auth table should be empty:", res.rows)})
  })

  it("empty cart",async()=>{
    const res = await axios({
      method: 'get',
      url: ENDPOINT + '/get-user-cart',
      headers: {
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID
      }
    })
    expect(res.status).toBe(200);
    console.log(res.data)
  })

  it("update, get, re-update", async()=>{
    const addItemsSetOne = await axios({ //populate the cart
      method: 'post',
      url: ENDPOINT + '/update-user-cart',
      headers: {
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID
      },
      data: {
        cartItems: USER.itemSetOne
      }
    });
    expect(addItemsSetOne.status).toBe(200);
    console.log(addItemsSetOne.data)

    const firstGet = await axios({
      method: 'get',
      url: ENDPOINT + '/get-user-cart',
      headers: {
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID
      }
    })
    expect(firstGet.status).toBe(200)
    console.log('Item set 1:', firstGet.data)

    const replaceWithSetTwo = await axios({ //update the cart
      method: 'post',
      url: ENDPOINT + '/update-user-cart',
      headers: {
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID
      },
      data: {
        cartItems: USER.itemSetTwo
      }
    });
    expect(replaceWithSetTwo.status).toBe(200);
    
    const secondGet = await axios({
      method: 'get',
      url: ENDPOINT + '/get-user-cart',
      headers: {
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID
      }
    })
    expect(secondGet.status).toBe(200);
    console.log("Item set 2:", secondGet.data)
  })
})
