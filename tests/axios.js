const axios = require("axios");
module.exports = async (req)=>{
  let res;
  try {
    res = await axios(req)
  } catch(e) {
    console.log("Failure on:", req, 
    "\n\nResponse:", e.response)
    res = e.response
  } 
  return res
}