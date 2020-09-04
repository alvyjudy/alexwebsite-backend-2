const path = require("path");
const {Client} = require("pg");
const create = require("../database/create.js");
const user = require("../database/user.js");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

const SCHEMA = "test_schema_userauth";

const client = new Client();

beforeAll(()=>{
  client
    .connect()
    .then(()=>{console.log("Connected")})
    .catch(console.log);

  client
    .query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`)
    .then(()=>{console.log("Dropped schema")})
    .catch(console.log);

  client
    .query(`CREATE SCHEMA ${SCHEMA};`)
    .then(()=>{console.log("Created schema")})
    .catch(console.log);

  client
    .query(`SET search_path TO ${SCHEMA}`)
    .then(()=>{console.log("search path set")})
    .catch(console.log);

  const execute = (action) => {
    client
      .query(action)
      .then(()=>{console.log('done:', action)})
      .catch(err=>console.log("failure on:", action, "msg", err));
  }

  Object.values(create).forEach(
    (action) => {execute(action);}
  )

  return client
    .query(`SELECT NOW();`)
    .then(()=>{console.log('last query completed')})
    .catch(console.log);

})

afterAll(()=>{
  return client
    .query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`)
    .then(()=>{
      console.log("Dropped schema and terminating connection");
      client.end();
    })
    .catch(console.log);
})


const USER_EMAIL = 'abc@gmail.com';
const USER_PW = 'abc';

test('register new user and login', ()=>{

  const insertQuery = {
    text: user.registerUser,
    values: [USER_EMAIL, USER_PW]
  }

  const readQuery = {
    text: user.loginUser,
    values: [USER_EMAIL, USER_PW]
  };

  client
    .query(insertQuery)
    .then(()=>{console.log("user registered")})

  return client  //actual test
    .query(readQuery)
    .then((res)=>{
      const user_id = res.rows[0]['user_id']
      console.log(`new user logged in, id is: ${user_id}`)
      expect(user_id).toBe(1);
    })
})

test('existing user', ()=>{
  const query = {
    text: user.checkIfEmailExists,
    values: [USER_EMAIL]
  }
  return client
    .query(query)
    .then((res)=>{
      console.log(res.rows);
      expect(res.rows[0]['email']).toBe(USER_EMAIL);
    })
})

test('new user', ()=>{
  const query = {
    text: user.checkIfEmailExists,
    values: ['abcd@gmail.com']
  }
  return client
    .query(query)
    .then((res)=>{
      expect(res.rows).toEqual([]);
    })
})

test("incorrect password", ()=>{
  const readQuery = {
    text: user.loginUser,
    values: [USER_EMAIL, 'wrong password']
  };

  return client 
    .query(readQuery)
    .then((res)=>{
      expect(res.rows).toEqual([]);
    })
})

