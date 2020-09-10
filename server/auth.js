const pool = require("./db.js");
const tokenStore = require("./tokenStore.js");
const user = require("../database/user.js");

const registerUser = async (req, res, next) => {
  const email = req.body.email;
  const pw = req.body.password;
  const userID = (await pool.query(user.registerUser, [email, pw])).rows[0].user_id
  
  res.status(200).send(userID);
}

const verifyEmailPw = async (req, res, next) => {
  const email = req.body.email
  const pw = req.body.password
  
  const authStatus = (await pool.query(user.loginUser, [email, pw])).rows[0]

  if (authStatus) {
    req.userID = authStatus.user_id;
    next();
  } else {
    res.status(403);
  }
}

const tokenGen = (userID) => {
  const tokenValue = Date.now();
  const tokenExpiry = Date.now() + 200000;
  return {tokenValue, tokenExpiry}
}

const setToken = async (req, res, next) => {

  const {tokenValue, tokenExpiry} = tokenGen();
  await pool.query(user.insertSession, [req.userID, tokenValue, tokenExpiry]);
  
  req.tokenValue = tokenValue;
  req.tokenExpiry = tokenExpiry;
  next()
}

const verifyToken = async (req, res, next) => {
  const tokenValue = req.get("tokenValue")
  const userID = req.get("userID")
  if (!tokenValue) {
    res.status(403).send("token header not included");
  } else {
    const validity = await tokenStore.verifyToken(tokenValue, userID);
    if (validity) {
      next()
    } else {
      res.status(403).send("invalid or expired token")
    }
  }
}

module.exports = {registerUser, verifyEmailPw, setToken, verifyToken}