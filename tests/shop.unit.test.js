const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

const {getMockRes: resMock} = require('@jest-mock/express')
const pool = require("../server/db.js");
const create = require("../database/create.js");
const user = require("../database/user.js")
const shop = require("../server/shop.js");

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


const nextMock = () => jest.fn(()=>{})

const SCHEMA = "schema_shop_unit_test";

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

describe("test getUserCart", ()=>{
  //turn off logging: console.log = () => {} 

  const USER1 = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    userID: undefined,
    token: undefined,
    itemsInCart: undefined,
    itemsToAddToCart: [
      {itemID: 12, count: 9},
      {itemID: 19, count: 1},
      {itemID: 32, count: 3},
      {itemID: 21, count: 3},
    ]
  }


  beforeEach(async()=>{
    //register user
    await pool
      .query(user.registerUser, [USER1.email, USER1.password])
      .then(res=>{
        USER1.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER1.userID)
      })

    //add items to cart
    const client = await pool.connect()
    USER1.itemsToAddToCart.forEach(item=>{
      client.query(user.addItemToCart, [USER1.userID, item.itemID, item.count])
    })
    await client.release();

    //check items are inserted
    await pool
      .query(user.getUserCart, [USER1.userID])
      .then(res=>{
        console.log("Cart items in database:", res.rows)
      })
    
  })

  afterEach(async ()=>{
    await pool
      .query(`DELETE FROM auth WHERE user_id = $1`, [USER1.userID])
      .then(()=>{
        USER1.userID = undefined
        console.log("userID cleared:", USER1.userID)
      })

    await pool
      .query(`SELECT * FROM auth;`)
      .then(res=>{console.log("auth table should be empty:", res.rows)})

    await pool.query(`SELECT * FROM cart;`)
      .then(res=>{console.log("cart should be empty:", res.rows)})
    

  })

  test("proper invoke", async ()=>{
    const req = reqMock({
      email: USER1.email, 
      password: USER1.password,
      userID: USER1.userID});
    const {res} = resMock();
    const next = nextMock();

    await shop.getUserCart()(req, res, next)
 
    expect(res.status).toHaveBeenCalledWith(200);
  })

  test("userID does not exist", async()=>{
    const req = reqMock({
      email: USER1.email, 
      password: USER1.password
    });
    const {res} = resMock();
    const next = nextMock();

    await shop.getUserCart()(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith("User ID not included")

  })
})

describe("test updateUserCart", ()=>{
  //turn off logging: console.log = () => {} 

  const USER1 = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    userID: undefined,
    token: undefined,
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
    //register user
    await pool
      .query(user.registerUser, [USER1.email, USER1.password])
      .then(res=>{
        USER1.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER1.userID)
      })
      .catch(e=>{console.log("User registration failed:", e)})

    //add items to cart
    const client = await pool.connect()
    USER1.itemSetOne.forEach(item=>{
      client.query(user.addItemToCart, [USER1.userID, item.itemID, item.count])
    })
    await client.release()

    //check items are inserted
    await pool
      .query(user.getUserCart, [USER1.userID])
      .then(res=>{
        console.log("Cart items in database:", res.rows)
      })
    
  })

  afterEach(async ()=>{
    await pool
      .query(`DELETE FROM auth WHERE user_id = $1`, [USER1.userID])
      .then(()=>{
        USER1.userID = undefined
        console.log("userID cleared:", USER1.userID)
      })
      .catch(e=>{console.log("delete user auth failed")})

    await pool
      .query(`SELECT * FROM auth;`)
      .then(res=>{console.log("auth table should be empty:", res.rows)})

    await pool.query(`SELECT * FROM cart;`)
      .then(res=>{console.log("cart should be empty:", res.rows)})
    
      
  })

  test("",async ()=>{
    const req = reqMock({
      cartItems: USER1.itemSetTwo,
      userID: USER1.userID  
    })
    const {res} = resMock();
    const next = nextMock();
    await shop.updateUserCart()(req, res, next)
    await pool.query(user.getUserCart, [USER1.userID]).then(res=>{console.log(res.rows)})
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("Successfully updated cart")
  })
})