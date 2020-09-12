module.exports = {
  registerUser:`INSERT INTO auth 
    (email, pw_hash) 
    VALUES ($1, $2) returning user_id;`,

  loginUser: `SELECT user_id FROM auth 
    WHERE email = $1 AND pw_hash = $2;`,

  insertSession:`INSERT INTO session 
    (user_id, token_value, expiry) VALUES
    ($1, $2, $3);`,
  
  getSession:`SELECT token_value, expiry FROM session
    WHERE user_id = $1;`,

  rmSession: `DELETE FROM session WHERE user_id = $1;`,

  checkIfEmailExists: `SELECT email FROM auth
    WHERE email = $1;`,

  addItemToCart: `INSERT INTO cart 
  (user_id, item_id, count) 
  VALUES ($1, $2, $3);`,

  removeItemFromCart:`DELETE FROM cart WHERE item_id = $1;`,

  getUserCart: `SELECT item_id, count FROM cart
    WHERE user_id = $1 ORDER BY item_id ASC; `,

  createOrder:`INSERT INTO orders 
    (user_id, address, payment_id) VALUES 
    ($1, $2, $3) returning order_id;`,

  addItemToOrder: `INSERT INTO checked_out 
    (item_id, order_id, count) VALUES
    ($1, $2, $3);`,

  getOrderDetail: `SELECT 
    orders.user_id, orders.address, orders.payment_id, checked_out.item_id, checked_out.count
    FROM orders INNER JOIN checked_out 
    ON orders.order_id = checked_out.order_id
    WHERE orders.order_id = $1 
    ORDER BY checked_out.item_id ASC;`,

  getUserOrders: `SELECT
    order_id FROM orders WHERE user_id = $1;`,

  rmOrder: `DELETE FROM orders WHERE order_id = $1;`
}