const express = require("express");
const app = express();
const pool = require("./db.js");
const auth = require("./auth.js");
const shop = require("./shop.js");
const orders = require("./orders.js");
const dbUser = require('../database/user.js');

const router = express.Router();

router.get('/ping', (req, res)=>{
  res.status(200).send("Hello world");
})

router.get("/time", async (req, res)=>{
  const client = await pool.connect();
  const time = (await client.query(`SELECT NOW();`)).rows[0];
  console.log(time);
  res.status(200).send(time);
  client.release();
})

router.post("/register",
  express.json(),
  auth.registerUser()
)

router.post("/login", 
  express.json(), 
  auth.verifyEmailPw(),
  auth.setToken()
)

router.post("/check-token",
  auth.verifyToken(),
  (req, res) => {
    res.status(200).send("Valid token")
  }
)

router.get("/get-user-cart",
  auth.verifyToken(),
  shop.getUserCart()
)

router.post("/update-user-cart",
  express.json(),
  auth.verifyToken(),
  shop.updateUserCart()
)

router.get("/get-user-orders",
  auth.verifyToken(),
  orders.getUserOrders()
)

router.get("/get-order-detail",
  auth.verifyToken(),
  orders.getOrderDetail()
)

router.post("/create-order",
  express.json(),
  auth.verifyToken(),
  orders.createOrder()
)

router.get("/remove-order",
  auth.verifyToken(),
  orders.removeOrder()
)

app.use('/api', router)

module.exports = app;