const CachedTokens = () => {
  
  const tokens = [] //{userID, tokenValue, expiry}

  const get = (userID) => {
    return instance.tokens.filter(each => {
      return userID === each.userID
    })[0] || undefined
  };

  const add = (token) => {
    instance.tokens.push(token)
  }

  const rm = (userID) => {
    instance.tokens = instance.tokens.filter(
      each => userID !== each.userID
    )
  }

  const flush = () => {
    instance.tokens = []
  }

  const instance = {tokens, get, add, rm, flush}
  return instance
}

cachedTokens = CachedTokens();

module.exports = cachedTokens;