//turn off logging: 
console.log = () =>{}

const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

const {getMockRes: resMock} = require('@jest-mock/express')
const pool = require("../server/db.js");
const create = require("../database/create.js");
const user = require("../database/user.js")
const orders = require("../server/orders.js");
const SCHEMA = "schema_orders_middleware_test";

const reqMock = (valuePair) => {
  const {email, 
    password, 
    tokenValue, 
    tokenExpiry, 
    userID,
    orderItems,
    orderID,
    address,
    paymentID
  } = valuePair;

  const get = (field) => {
    return reqObj.headers[field]
  }

  const reqObj = {
    body:{
      email,
      password,
      address,
      paymentID,
      orderItems,
    },
    headers:{
      "Token-Value": tokenValue,
      "User-ID": userID,
      "Content-Type": "application/json",
      "Order-ID": orderID
    },
    get
  }
  return reqObj
}

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

describe("test getUserOrders", ()=>{
  const USER = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    tokenValue: "1111",
    paymentID: ['1234', '5678'],
    address: '111 Bay St.',
    orderID: [undefined, undefined]
  }

  beforeEach(async()=>{
    //register user
    await pool
      .query(user.registerUser, [USER.email, USER.password])
      .then(res=>{
        USER.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER.userID)
      })
    
    //insert token into session
    await pool
      .query(user.insertSession, [USER.userID, USER.tokenValue, Date.now()+1000000])
      .then(()=>{})
      .catch(e=>{
        throw Error("Error inserting token into session")
      })
    
    //create two order entry
    await pool
      .query(user.createOrder, [USER.userID, USER.address, USER.paymentID[0]])
      .then(res=>{
        USER.orderID[0] = res.rows[0].order_id;
      })
      .catch((e)=>{throw Error("Failure on first order entry creation\n\n" + e.toString())})

    await pool
      .query(user.createOrder, [USER.userID, USER.address, USER.paymentID[1]])
      .then(res=>{
        USER.orderID[1] = res.rows[0].order_id;
      })
      .catch((e)=>{
        throw Error("Failure on second order entry creation\n\n" + e.toString())
      })

    //show order
    await pool
      .query(user.getUserOrders, [USER.userID])
      .then(res=>{
        console.log("orders after insertion", res.rows)
      })
      .catch(e=>{
        throw Error("Failure on grabing user order\n\n"+e.toString())
      })
  })

  afterEach(async()=>{
    //remove user
    await pool
      .query(`DELETE FROM auth WHERE user_id = $1`, [USER.userID])
      .then(()=>{
        USER.userID = undefined
        console.log("userID cleared:", USER.userID)
      })
      .catch((e)=>{
        throw Error("Error removing user")
      })
    
    await pool
      .query(`SELECT * FROM orders;`)
      .then((res)=>{
        console.log("Empty orders:", res.rows)
      })
      .catch(e=>{
        throw Error('error showing empty orders')
      })
  })

  test("valid credential", async()=>{
    const req = reqMock({
      userID: USER.userID,
      tokenValue: USER.tokenValue
    })
    const {res, next} = resMock();

    await orders.getUserOrders()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledTimes(1);
  })

  test("missing userID", async()=>{
    const req = reqMock({
      userID: undefined,
      tokenValue: USER.tokenValue
    })
    const {res, next} = resMock();

    await orders.getUserOrders()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403)
  })

})

describe("test getOrderDetail", ()=>{
  const USER = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    tokenValue: "1111"
  }

  const ORDER1 = {
    paymentID: '1234',
    address: '111 Bay St.',
    orderID: undefined,
    items: [
      {itemID: 1, itemCount: 3},
      {itemID:2, itemCount:1},
      {itemID:3, itemCount: 2}
    ]
  }

  const ORDER2 = {
    paymentID: '123',
    address: '111 Church St.',
    orderID: undefined,
    items: [
      {itemID: 1, itemCount: 3},
      {itemID:20, itemCount:1},
      {itemID:3, itemCount: 2},
      {itemID:4, itemCount:9}
    ]
  }

  beforeEach(async()=>{
    //register user
    await pool
      .query(user.registerUser, [USER.email, USER.password])
      .then(res=>{
        USER.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER.userID)
      })
      .catch(e=>{
        throw Error("Error in registering user:\n\n"+e.toString())
      })
    
    //insert token into session
    await pool
      .query(user.insertSession, [USER.userID, USER.tokenValue, Date.now()+1000000])
      .then(()=>{})
      .catch(e=>{
        throw Error("Error inserting token into session\n\n"+e.toString())
      })

    
    //create the first order entry and populate items
    await pool
      .query(user.createOrder, [USER.userID, ORDER1.address, ORDER1.paymentID])
      .then(res=>{
        ORDER1.orderID = res.rows[0].order_id;
      })
      .catch((e)=>{throw Error("Failure on first order entry creation\n\n" + e.toString())})

    let client = await pool.connect();
    ORDER1.items.forEach(item=>{
      client.query(user.addItemToOrder, [ORDER1.orderID, item.itemID, item.itemCount])
      .then(()=>{console.log("Inserted!")})
      .catch(e=>{
        throw Error("Error adding first items set into order\n\n"+e.toString())
      })
    })
    await client.release();

    //create the second order entry and populate items
    await pool
      .query(user.createOrder, [USER.userID, ORDER2.address, ORDER2.paymentID])
      .then(res=>{
        ORDER2.orderID = res.rows[0].order_id;
      })
      .catch((e)=>{throw Error("Failure on first order entry creation\n\n" + e.toString())})

    client = await pool.connect();
    ORDER2.items.forEach(item=>{
      client
        .query(user.addItemToOrder, [ORDER2.orderID, item.itemID, item.itemCount])
        .then(()=>{console.log("Inserted! 2")})
        .catch(e=>{
          throw Error("Error adding second items set into order\n\n"+e.toString())
        })
    })
    await client.release();

    await pool
      .query(`SELECT * FROM checked_out;`)
      .then(res=>{
        console.log("Checked out items", res.rows)
      })
      .catch(e=>{
        throw Error("Error showing checked out items\n\n", e.toString())
      })

  })
    
  afterEach(async()=>{
    //remove user
    await pool
    .query(`DELETE FROM auth WHERE user_id = $1`, [USER.userID])
    .then(()=>{
      USER.userID = undefined
      console.log("userID cleared:", USER.userID)
    })
    .catch((e)=>{
      throw Error("Error removing user\n\n"+e.toString())
    })
      
    await pool
      .query(`SELECT * FROM orders;`)
      .then((res)=>{
        console.log("Empty orders:", res.rows)
      })
      .catch(e=>{
        throw Error('error showing empty orders')
      })
  })

  test("get first order", async()=>{
    const req = reqMock({orderID: ORDER1.orderID})
    const {res, next} = resMock();
    await orders.getOrderDetail()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledTimes(1)
  })

  test("invalid orderID", async()=>{
    const req = reqMock({orderID: 1234})
    const {res, next} = resMock();
    await orders.getOrderDetail()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith("Item list empty")
  })
  
})

describe("test createOrder", ()=>{
  const USER = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    tokenValue: "1111"
  }

  const ORDER1 = {
    paymentID: '1234',
    address: '111 Bay St.',
    orderID: undefined,
    items: [
      {itemID: 1, itemCount: 3},
      {itemID:2, itemCount:1},
      {itemID:3, itemCount: 2}
    ]
  }

  const ORDER2 = {
    paymentID: '123',
    address: '111 Church St.',
    orderID: undefined,
    items: [
      {itemID: 1, itemCount: 3},
      {itemID:20, itemCount:1},
      {itemID:3, itemCount: 2},
      {itemID:4, itemCount:9}
    ]
  }

  beforeEach(async()=>{
    //register user
    await pool
      .query(user.registerUser, [USER.email, USER.password])
      .then(res=>{
        USER.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER.userID)
      })
      .catch(e=>{
        throw Error("Error in registering user:\n\n"+e.toString())
      })
  })

  afterEach(async()=>{
    //remove user
    await pool
    .query(`DELETE FROM auth WHERE user_id = $1`, [USER.userID])
    .then(()=>{
      USER.userID = undefined
      console.log("userID cleared:", USER.userID)
    })
    .catch((e)=>{
      throw Error("Error removing user\n\n"+e.toString())
    })
      
    await pool
      .query(`SELECT * FROM orders;`)
      .then((res)=>{
        console.log("Empty orders:", res.rows)
      })
      .catch(e=>{
        throw Error('error showing empty orders')
      })
  })

  test("valid credentials", async ()=>{
    const req = reqMock({
      orderItems: ORDER1.items,
      address: ORDER1.address,
      paymentID: ORDER1.paymentID,
      userID: USER.userID
    })
    const {res, next} = resMock();
    await orders.createOrder()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);

  })

  test("two orders", async()=>{
    const req = reqMock({
      orderItems: ORDER1.items,
      address: ORDER1.address,
      paymentID: ORDER1.paymentID,
      userID: USER.userID
    })
    const {res, next, clearMockRes} = resMock();
    await orders.createOrder()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);

    clearMockRes();

    const req2 = reqMock({
      orderItems: ORDER2.items,
      address: ORDER2.address,
      paymentID: ORDER2.paymentID,
      userID: USER.userID
    })
    await orders.createOrder()(req2, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  })
})

describe("test removeOrder", ()=>{
  const USER = {
    email: 'user1@gmail.com', 
    password: 'abcd',
    tokenValue: "1111"
  }

  const ORDER1 = {
    paymentID: '1234',
    address: '111 Bay St.',
    orderID: undefined,
    items: [
      {itemID: 1, itemCount: 3},
      {itemID:2, itemCount:1},
      {itemID:3, itemCount: 2}
    ]
  }

  const ORDER2 = {
    paymentID: '123',
    address: '111 Church St.',
    orderID: undefined,
    items: [
      {itemID: 1, itemCount: 3},
      {itemID:20, itemCount:1},
      {itemID:3, itemCount: 2},
      {itemID:4, itemCount:9}
    ]
  }

  beforeEach(async()=>{
    //register user
    await pool
      .query(user.registerUser, [USER.email, USER.password])
      .then(res=>{
        USER.userID = res.rows[0].user_id
        console.log("User registered, userID:", USER.userID)
      })
      .catch(e=>{
        throw Error("Error in registering user:\n\n"+e.toString())
      })
    
    //insert token into session
    await pool
      .query(user.insertSession, [USER.userID, USER.tokenValue, Date.now()+1000000])
      .then(()=>{})
      .catch(e=>{
        throw Error("Error inserting token into session\n\n"+e.toString())
      })

    
    //create the first order entry and populate items
    await pool
      .query(user.createOrder, [USER.userID, ORDER1.address, ORDER1.paymentID])
      .then(res=>{
        ORDER1.orderID = res.rows[0].order_id;
      })
      .catch((e)=>{throw Error("Failure on first order entry creation\n\n" + e.toString())})

    let client = await pool.connect();
    ORDER1.items.forEach(item=>{
      client.query(user.addItemToOrder, [ORDER1.orderID, item.itemID, item.itemCount])
      .then(()=>{console.log("Inserted!")})
      .catch(e=>{
        throw Error("Error adding first items set into order\n\n"+e.toString())
      })
    })
    await client.release();

    //create the second order entry and populate items
    await pool
      .query(user.createOrder, [USER.userID, ORDER2.address, ORDER2.paymentID])
      .then(res=>{
        ORDER2.orderID = res.rows[0].order_id;
      })
      .catch((e)=>{throw Error("Failure on first order entry creation\n\n" + e.toString())})

    client = await pool.connect();
    ORDER2.items.forEach(item=>{
      client
        .query(user.addItemToOrder, [ORDER2.orderID, item.itemID, item.itemCount])
        .then(()=>{console.log("Inserted! 2")})
        .catch(e=>{
          throw Error("Error adding second items set into order\n\n"+e.toString())
        })
    })
    await client.release();

    await pool
      .query(`SELECT * FROM checked_out;`)
      .then(res=>{
        console.log("Checked out items", res.rows)
      })
      .catch(e=>{
        throw Error("Error showing checked out items\n\n", e.toString())
      })

  })
    
  afterEach(async()=>{
    //remove user
    await pool
    .query(`DELETE FROM auth WHERE user_id = $1`, [USER.userID])
    .then(()=>{
      USER.userID = undefined
      console.log("userID cleared:", USER.userID)
    })
    .catch((e)=>{
      throw Error("Error removing user\n\n"+e.toString())
    })
      
    await pool
      .query(`SELECT * FROM orders;`)
      .then((res)=>{
        console.log("Empty orders:", res.rows)
      })
      .catch(e=>{
        throw Error('error showing empty orders')
      })
  })

  test("remove 1 order", async()=>{
    const req = reqMock({
      orderID: ORDER1.orderID
    })
    const {res, next} = resMock()
    await orders.removeOrder()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("Order successfully removed. OrderID:" + ORDER1.orderID.toString())
  })

  test("remove 2 orders", async()=>{
    const req = reqMock({
      orderID: ORDER1.orderID
    })
    const {res, next} = resMock()
    await orders.removeOrder()(req, res, next);

    const req2 = reqMock({
      orderID: ORDER2.orderID
    })
    await orders.removeOrder()(req2, res, next);
    expect(res.status).toHaveBeenLastCalledWith(200);

  
  })

})