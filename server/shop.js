const pool = require("./db.js");
const user = require("../database/user.js");

const _getUserCart = async (userID) => {
    let result = (await pool.query(user.getUserCart, [userID])).rows;
    
    if (result.length != 0) {
      result = result.map(each=>{
        return {itemID: each.item_id, count:each.count}
      })
    }
    return result //[{itemID, count}, ...] or []
}

const getUserCart = () => async (req, res, next) => {
  if (!req.userID || false) {
    res.status(400).send("User ID not included") 
  } else {
    const cart = await _getUserCart(req.userID)
    console.log(cart);
    res.status(200).json(cart)
  }
}

const updateUserCart = () => async (req, res, next) => {
  const newCart = req.body.cartItems;
  const userID = req.userID;

  if (!newCart) {
    res.status(400).send("Cart items not received")
  }
  if (userID || false) {
    res.status(400).send("User ID not included")
  }

  const client = await pool.connect();
  client.query(`BEGIN;`);
  try {
    client.query(`DELETE FROM cart WHERE user_id = $1;`, [userID]);
    newCart.forEach(item=>{
      client.query(user.addItemToCart, [userID, item.itemID, item.count])
    })
  } catch(e) {
    client.query(`ROLLBACK`);
    console.log("ERROR, rolling back, message:\n", e)
  } finally {
    client.query(`COMMIT;`)
    res.status(200).send("Successfully updated cart")
    await client.release()
  }
  
  

}

 module.exports = {getUserCart, updateUserCart}