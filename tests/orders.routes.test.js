//turn off logging: 
console.log = () =>{}

const path = require("path");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

const pool = require("../server/db.js");
const create = require("../database/create.js");
const axios = require("./axios.js");
const {createHttpTerminator} = require("http-terminator");
const app = require("../server/app.js");
const user = require("../database/user.js");


const SCHEMA = "schema_orders_routes_test";
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
    const res = await axios({
      method: 'get',
      url: ENDPOINT + '/get-user-orders',
      headers: {
        'Content-Type':'application/json',
        'Token-Value': USER.tokenValue,
        'User-ID': USER.userID
      }
    })

    expect(res.status).toBe(200)
    expect(res.data).toEqual(USER.orderID)
  })

  test("missing userID", async()=>{
    const res = await axios({
      method: 'get',
      url: ENDPOINT + '/get-user-orders',
      headers: {
        'Content-Type':'application/json',
        'Token-Value': USER.tokenValue,
      }
    })
    
    expect(res.status).toBe(403)
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
      {itemID:3, itemCount: 2},
      {itemID:4, itemCount:9},
      {itemID:20, itemCount:1},
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
    const res = await axios({
      method: 'get',
      url: ENDPOINT + '/get-order-detail',
      headers:{
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID,
        'Order-ID':ORDER1.orderID
      }
    })
    expect(res.status).toBe(200)
    expect(res.data.items).toEqual(ORDER1.items)
    expect(res.data.address).toBe(ORDER1.address)
    expect(res.data.paymentID).toBe(ORDER1.paymentID)
  })

  test("invalid orderID", async()=>{
    const res = await axios({
      method: 'get',
      url: ENDPOINT + '/get-order-detail',
      headers:{
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID,
        'Order-ID':123456
      }
    })
    expect(res.status).toBe(400)
    expect(res.data).toBe("Item list empty")
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
      {itemID:3, itemCount: 2},
      {itemID:4, itemCount:9},
      {itemID:20, itemCount:1},
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
      throw Error("Error inserting token into session")
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
    const res = await axios({
      method: 'post',
      url: ENDPOINT + '/create-order',
      headers: {
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID,
      },
      data:{
        orderItems: ORDER1.items,
        address: ORDER1.address,
        paymentID: ORDER1.paymentID,
      }
    })
    expect(res.status).toBe(200);
    expect(res.data).toBeDefined();

  })

  test("two orders", async()=>{
    const res = await axios({
      method: 'post',
      url: ENDPOINT + '/create-order',
      headers: {
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID,
      },
      data:{
        orderItems: ORDER1.items,
        address: ORDER1.address,
        paymentID: ORDER1.paymentID,
      }
    })

    const res2 = await axios({
      method: 'post',
      url: ENDPOINT + '/create-order',
      headers: {
        'Content-Type':'application/json',
        'Token-Value':USER.tokenValue,
        'User-ID':USER.userID,
      },
      data:{
        orderItems: ORDER2.items,
        address: ORDER2.address,
        paymentID: ORDER2.paymentID,
      }
    })

    expect(res.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res.data).toBeDefined();
    expect(res2.data).toBeDefined();
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
      {itemID:3, itemCount: 2},
      {itemID:4, itemCount:9},
      {itemID:20, itemCount:1},
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
    const res = await axios({
      method: 'get',
      url: ENDPOINT + '/remove-order',
      headers: {
        'Content-Type':'application/json',
        'Token-Value': USER.tokenValue,
        'Order-ID':ORDER1.orderID,
        'User-ID':USER.userID
      }
    })
    expect(res.status).toBe(200);
    expect(res.data).toBe("Order successfully removed. OrderID:" + ORDER1.orderID.toString())
  })

  test("remove 2 orders", async()=>{
    let res = await axios({
      method: 'get',
      url: ENDPOINT + '/remove-order',
      headers: {
        'Content-Type':'application/json',
        'Token-Value': USER.tokenValue,
        'Order-ID':ORDER1.orderID,
        'User-ID':USER.userID
      }
    })
    expect(res.status).toBe(200);
    expect(res.data).toBe("Order successfully removed. OrderID:" + ORDER1.orderID.toString())

    res = await axios({
      method: 'get',
      url: ENDPOINT + '/remove-order',
      headers: {
        'Content-Type':'application/json',
        'Token-Value': USER.tokenValue,
        'Order-ID':ORDER1.orderID,
        'User-ID':USER.userID
      }
    })
    expect(res.status).toBe(200);
    expect(res.data).toBe("Order successfully removed. OrderID:" + ORDER1.orderID.toString())


  
  })

})