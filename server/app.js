const express = require("express");
const app = express();
const pool = require("./db.js");
const auth = require("./auth.js");
const shop = require("./shop.js");
const dbUser = require('../database/user.js');

app.get('/ping', (req, res)=>{
  res.status(200).send("Hello world");
})

app.get("/time", async (req, res)=>{
  const client = await pool.connect();
  const time = (await client.query(`SELECT NOW();`)).rows[0];
  console.log(time);
  res.status(200).send(time);
  client.release();
})

app.post("/register",
  express.json(),
  auth.registerUser()
)

app.post("/login", 
  express.json(), 
  auth.verifyEmailPw(),
  auth.setToken(),
  (req, res) => {
    res.status(200).send(req.tokenValue.toString());
  }
)

app.post("/check-token",
  auth.verifyToken(),
  (req, res) => {
    res.status(200).send("Valid token")
  }
)

app.get("/get-user-cart",
  auth.verifyToken(),
  shop.getUserCart()
)

app.post("/update-user-cart",
  express.json(),
  auth.verifyToken(),
  shop.updateUserCart()
)

module.exports = app;