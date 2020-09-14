# Overview

This is the backend server source code for website Alex's Shed built with
ExpressJS. It defines a set of APIs to store and retrieve user and catalog 
information. The application runs on Google Cloud App Engine (GAE) and 
interacts with the frontend server (also running on GAE) and the Cloud SQL 
for Postgres database.

# API

A set of routes provide the necessary functionality for the frontend part
of this website. When running locally, the API endpoint is 
`http://localhost:3002`

All requests accessing user information must have its headers include
`Token-Value` and `User-ID` fields.

- POST `/register`

  Registers a user. 
  
  Mandatory request headers:
  ```
  "Content-Type": "application/json"
  ```

  Request body:
  ```
  {
    "email": "useremail@gmail.com",
    "password": "userpassword"
  }
  ```

  Response: a number string representing the user ID

- POST `/login` 

  Login a registered user and return the userID and token value in the 
  response

  Mandatory request headers:
  ```
  "Content-Type": "application/json"
  ```

  Request body:
  ```
  {
    "email": "useremail@gmail.com",
    "password": "userpassword"
  }
  ```

  Response body:
  ```
  {
    "tokenValue": "askdlbvuh1235quewi12ulqfq",
    "userID": "1"
  }
  ```

- GET `/get-user-cart`

  Returns a JSON object that shows what items the user has added to shopping
  cart.

  Mandatory request headers:
  ```
  "User-ID":""
  "Token-Value":""
  ```

  Request body: optional

  Response: 
  ```
  [
    {itemID: 12, count: 9},
    {itemID: 19, count: 1},
    {itemID: 32, count: 3},
    {itemID: 21, count: 3},
  ]
  ```

- POST `/update-user-cart`


# Development and set up 

To start the server, install the required dependencies. Make sure the
PostgreSQL server is running and place authentication information
in `.env` in the `deployment` folder. Then, invoke `server.js` in `deployment`

## Local development and testing 

Tests are written with the Jest framework. These tests require connection
to a database and the connection configuration are obtained using environment
variables by looking up sepcial files. There are two such files in the `tests` 
folder, the `.env.cloud` contains environment variables required to establish
connection to the Google Cloud SQL Proxy, which in turn connects to a 
database instance for testing purpose on the cloud. The `.env.local` contains
environment variables required for connecting to a local PostgreSQL database,
which must be installed. 

When testing with Cloud SQL, the locally running jest program connects to the 
database instance (database name: `dev-db`, instance name: 
`kahului:northamerica-northeast1:dev-db`) through Cloud SQL Proxy 
(installed locally). The authentication is taken care of if gcloud command line
is authenticated with an account that has permission to the Cloud SQL service.

To run tests, first export an environment variable specifying whether to run
it against local database or cloud database.

`export TESTENV='local'` 

or 

`export TESTENV='cloud'`

Then, make sure that the connection can be established correctly by running 
a specific test file: 

`yarn run jest tests/setup.test.js` 

Afterwards, execute the tests by running

`yarn run jest`

The above steps have been aliased into a single command defined in 
`package.json`:

`yarn run testLocal`

`yarn run testCloud`

See [Project Structure](#project-structure) for how the tests are organized.

## Project structure

Core code is contained in `server` folder, where all the routes are defined
within `app.js`. This file uses middlewares defined in files like 
`auth.js`, `shop.js` and such. 

The service currently depends on a local PostgreSQL server. The required
credentials to establish connection is defined in a `.env` file to allow
flexibility when the service is deployed on the cloud. 

SQL statements are stored in two files under `database` folder. `create.js` 
contains the statements to initialize the database and `user.js` contains
all the read/write operations to support user interaction.

Tests are written with Jest framework and placed in `tests` folder. Other than 
the few that test server setup, tests are defined on 3 levels of abstraction. 
`*.routes.test.js` are end-to-end tests that require HTTP transactions 
and simulates the requests coming from the front end. `*.middlewares.test.js`
are those that tests the ExpressJS middleware. `*.db.test.js` directly test
the SQL statements using a node-postgres driver. Each test file is 
self-contained and will invoke its own database connection
and server instance.

## CI/CD and deployment (WIP)

This project is configured with a CI/CD pipeline using Google Cloud Build.
When a pull request is created on the repository, Cloud Build is triggered,
directly through Github and runs the container `node` to conduct testing and
submit the result back. The steps are defined in `test.cloudbuild.yaml` file.
The tests will connect to the `test` database on the `dev-db` instance on
Cloud SQL. 

When the `future` branch is pushed on Github, it triggers Cloud Build to deploy a new
version of the application tagged with "future", without directing traffic
to it. The steps are defined in `deploy-future.cloudbuild.yaml`. The app
will use the `future` database on the `production` instance on Cloud SQL.

When `master` branch is pushed on Github, it triggers Cloud Build to deploy a new version
tagged with "master" and direct all traffic to the website. Every move of 
the master branch should be accompanied by a version tag in the git log. 
The steps are defined in `deploy-master.cloudbuild.yaml`. The app will use
`master` database on the `production` instance on Cloud SQL. 

Database management is done on Google Cloud Console, for administration,
creation, deletion and such. 

Access priviledges are provided by the Cloud Build service account
which is used when any of the three aforementioned actions are triggered. 
