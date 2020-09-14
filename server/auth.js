const pool = require("./db.js");
const tokenStore = require("./tokenStore.js");
const user = require("../database/user.js");

const registerUser = () => async (req, res, next) => {
  const email = req.body.email;
  const pw = req.body.password;
  if (!email || !pw) {res.status(400).send("missing email or pw")}
  const userID = (await pool.query(user.registerUser, [email, pw])).rows[0].user_id
  res.status(200).send(userID.toString());
}

const verifyEmailPw = () => async (req, res, next) => {
  const email = req.body.email
  const pw = req.body.password
  if (!email || !pw) {
    console.log("Email or pw not found in request body")
    res.status(400).send("Email or pw not found in request body")
  }
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

const setToken = () => async (req, res, next) => {
  const userID = req.userID
  if (!userID) {res.status(400).send("User-ID not found in req.userID")}
  const {tokenValue, tokenExpiry} = tokenGen();
  await pool.query(user.insertSession, [userID, tokenValue, tokenExpiry]);
  
  res.status(200).json({
    tokenValue: tokenValue.toString(),
    userID: userID
  })
}

const verifyToken = () => async (req, res, next) => {
  const tokenValue = req.get("Token-Value")
  const userID = req.get("User-ID")
  if (!userID) {
    res.status(403).send("userID not included in header")
  } else if (!tokenValue) {
    res.status(403).send("Token header not included");
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