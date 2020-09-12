//turn off logging: 
console.log = () =>{}

const cachedTokens = require("../server/cachedTokens.js")

afterEach(()=>{
  cachedTokens.flush()
})

test("initial empty", ()=>{
  expect(cachedTokens.tokens).toEqual([]);
})

test("flush", ()=>{
  cachedTokens.tokens = 'stuff'
  expect(cachedTokens.tokens).toEqual('stuff');
  cachedTokens.flush();
  expect(cachedTokens.tokens).toEqual([]);
})

test("add", ()=>{
  const token1 = {userID: 1, tokenValue: 'abc', expiry: 100}
  const token2 = {userID: 2, tokenValue: 'ddssa', expiry: 1000}
  cachedTokens.add(token1)
  cachedTokens.add(token2)
  expect(cachedTokens.get(token1.userID)).toBe(token1)
})

test("remove", ()=>{
  const token1 = {userID: 1, tokenValue: 'abc', expiry: 100}
  const token2 = {userID: 2, tokenValue: 'ddssa', expiry: 1000}
  cachedTokens.add(token1)
  cachedTokens.add(token2)
  cachedTokens.rm(token2.userID)
  console.log(cachedTokens.tokens)
  expect(cachedTokens.tokens).toEqual([token1])
})