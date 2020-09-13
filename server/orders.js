const pool = require("./db.js");
const user = require("../database/user.js");

const getUserOrders = () => async (req, res, next) => {
  const userID = req.get('User-ID')
  if (!userID) {
    res.status(403).send("Error in getUserOrders middleware, User ID not included")
  } else {
    let orders;
    await pool.query(user.getUserOrders, [userID])
      .then(result=>{
        orders = result.rows.map(row=>row.order_id)
      })
      .catch(e=>{
        throw Error("Error retrieving user order\n\n"+e.toString())
      })
    res.status(200).json(orders)
  }
}

const getOrderDetail = () => async (req, res, next) => {
  const orderID = req.get("Order-ID");
  if (!orderID) {res.status(403).send("Error in getOrderDetail middleware, orderID not incuded in header")}

  let orderDetail;
  await pool.query(user.getOrderDetail, [orderID])
    .then(result=>{
      if (result.rows.length == 0) {
        res.status(400).send("Item list empty")
      } else {
        const address = result.rows[0].address;
        const paymentID = result.rows[0].payment_id;
        const items = result.rows.map(row=>{
          return {
            itemID: row.item_id,
            itemCount: row.count
          }
        })
        orderDetail = {address, paymentID, items}
      } 
    })
    .catch(e=>{
      throw Error("Error on retrieving order detail\n\n"+e.toString())
    })
  res.status(200).json(orderDetail)
}

const createOrder = () => async (req, res, next) => {
  const orderItems = req.body.orderItems;
  const address = req.body.address;
  const paymentID = req.body.paymentID
  const userID = req.get("User-ID")

  if (!orderItems) {res.status(400).send("Items not included in body")}
  else if (!address) {res.status(400).send("Address not included in body")}
  else if (!paymentID) {res.status(400).send("PaymentID not included in body")}
  else if (!userID) {res.status(400).send("User-ID not found in header")}
  else {
    let orderID;
    const client = await pool.connect();

    await client.query(user.createOrder, [userID, address, paymentID])
      .then(result=>{orderID = result.rows[0].order_id})
      .catch(e=>{throw Error("Error in creating order entry\n\n"+e.toString())})
    
    orderItems.forEach(item=>{
      client.query(user.addItemToOrder, [orderID, item.itemID, item.itemCount])
        .then(()=>{console.log("Inserted item")})
        .catch(e=>{throw Error("Error in inserting item to entry\n\n"+e.toString())})
    })
    await client.release()
    res.status(200).send(orderID.toString())
  
    
  }


}

const removeOrder = () => async (req, res, next) =>{
  const orderID = req.get("Order-ID")
  if (!orderID) {res.status(400).send("Order-ID not included in header")}
  else {
    await pool.query(user.rmOrder, [orderID])
      .catch(e=>{
        throw Error("Error removing order\n\n" + e.toString())
      })
    res.status(200).send("Order successfully removed. OrderID:" + orderID.toString())
  }
}


module.exports = {getUserOrders, getOrderDetail, createOrder, removeOrder}