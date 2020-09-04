const EXPECTED_TABLES = [
  'auth',
  'cart',
  'catalog',
  'checked_out',
  'orders',
  'profile',
  'session'
]

const SCHEMA = "test_schema_create";

const path = require("path");
const {Client} = require("pg");
const actions = require("../database/create.js");
require("dotenv").config({path:path.resolve(path.dirname(__filename), ".env")});

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
    .query(`SET search_path TO ${SCHEMA};`)
    .then(()=>{console.log("schema search path set")})
    .catch(console.log);

  const execute = (action) => {
    client
      .query(action)
  }

  Object.values(actions).forEach(
    (action) => {
      execute(action);
    }
  )

  return client
    .query(`SELECT NOW();`)
    .then(()=>{console.log('last query completed')})
    .catch(console.log);

})

test("test table and schema creation", ()=>{
  console.log("running test");
  return client
    .query(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = '${SCHEMA}';`)
    .then(res=>{
      const tableList = [];
      res.rows.forEach(item=>{tableList.push(item.tablename)})
      tableList.sort();
      expect(tableList).toEqual(EXPECTED_TABLES) ;
    })
  }
)

afterAll(()=>{
  return client
    .query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE;`)
    .then(()=>{
      console.log("Dropped schema and terminating connection");
      client.end();
    })
    .catch(console.log);
})