const express = require("express");
const app = express();
const pool = require("./db.js");
const auth = require("./auth.js");
const dbUser = require('../database/user.js');

app.get('/', (req, res)=>{
  res.status(200).send("Hello world");
})

app.get("/time", async (req, res)=>{
  const client = await pool.connect();
  const time = (await client.query(`SELECT NOW();`)).rows[0];
  console.log(time);
  res.status(200).send(time);
  client.release();
})

app.get("/login", 
  express.json(), 
  auth.verifyEmailPw,
  auth.setToken,
  (req, res) => {
    res.status(200).send(req.token);
  }
)

app.get("/cart", )
  

module.exports = app;