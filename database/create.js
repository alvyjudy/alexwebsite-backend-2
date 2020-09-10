module.exports = {
  auth: `CREATE TABLE IF NOT EXISTS auth (
    user_id serial PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    pw_hash TEXT NOT NULL
  );`,
  cart: `CREATE TABLE IF NOT EXISTS cart (
    item_id INT PRIMARY KEY,
    user_id INT,
    count INT,
    FOREIGN KEY (user_id) REFERENCES auth(user_id)
  );`,
  orders: `CREATE TABLE IF NOT EXISTS orders (
    order_id serial PRIMARY KEY,
    user_id INT,
    address TEXT NOT NULL,
    payment_id TEXT NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES auth(user_id)
  );`,
  checkedOut: `CREATE TABLE IF NOT EXISTS checked_out (
    item_id INT PRIMARY KEY,
    order_id INT,
    count INT,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) 
    ON DELETE CASCADE
  );`,
  catalog: `CREATE TABLE IF NOT EXISTS catalog (
    item_id INT PRIMARY KEY,
    url TEXT,
    description TEXT
  );`,
  session: `CREATE TABLE IF NOT EXISTS session (
    user_id INT PRIMARY KEY,
    token_value TEXT UNIQUE,
    expiry TEXT,
    FOREIGN KEY (user_id) REFERENCES auth(user_id)
    ON DELETE CASCADE
  );`,
  profile: `CREATE TABLE IF NOT EXISTS profile (
    user_id INT,
    address TEXT,
    phone INT
  );` 
}