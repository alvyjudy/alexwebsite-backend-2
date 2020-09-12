const {Pool} = require("pg");
let pool = new Pool();

module.exports = {
  query: async (text, params) => {
    let res;
    try {
      res = await pool.query(text, params);
    } catch (e) {
      console.log("Query failed to execute:", 
        "\u001b[31;1m", text, "\u001b[0;m",
        "params:", params, "\n\nError message", e);
      throw Error("Database operation failed!")
    }
    return res
  },
  connect: ()=> {
    return pool.connect()
  },
  end: ()=>{pool.end()}
}