const pool = require("./db.js");
const userDb = require("../database/user.js");
const cachedTokens = require("./cachedTokens.js");

const verifyToken = async (tokenValue, userID) => { 
  let storedToken = cachedTokens.get(userID)
  if (!storedToken) {
    const tokenInDB = (await pool.query(userDb.getSession, [userID])).rows[0];
    storedToken = {userID, 
      tokenValue: tokenInDB.token_value, 
      expiry: tokenInDB.expiry
    }
    cachedTokens.add(storedToken)
  }


  if (storedToken.expiry < Date.now()) { 
    console.log("expired")
    await pool.query(userDb.rmSession, [userID]).then("removed by verifyToken in store");
    cachedTokens.rm(userID);
    return false;
  } else if (storedToken.tokenValue === tokenValue.toString()) {
    return true;
  } else {
    return false;
  }

}

module.exports = {verifyToken};