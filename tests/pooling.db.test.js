//turn off logging: 
console.log = () =>{}

const path = require("path");
const {Client, Pool} = require("pg");
const create = require("../database/create.js");
const user = require("../database/user.js");
const ENVFILE = process.env.TESTENV === "cloud" ? ".env.cloud" : ".env.local"
require("dotenv").config({path:path.resolve(path.dirname(__filename), ENVFILE)});

const pool = new Pool();

test('dummy', async ()=>{
  const client = await pool.connect()
  console.log('connected')
  const result = await client.query(`SELECT NOW()`);
  client.release();
})

test('then style', ()=>{
  return pool
    .connect()
    .then(client=>{
      return client
        .query(`SELECT NOW()`)
        .then((res)=>{console.log(res.rows)})
        .then(()=>{return client})
    })
    .then(client=>{
      return client
        .query(`SELECT NOW()`)
        .then((res)=>{console.log('2', res.rows)})
        .then(()=>{return client})
    })
    .then((client)=>{client.release()})
    .catch(console.log)
})

afterAll(()=>{
  pool.end();
})
