global.cdn = 'https://s3.amazonaws.com/cdn.sparc.world'
global.CDN = 'https://s3.amazonaws.com/cdn.sparc.world'
if (process.env.NODE_ENV === 'production') {
  global.SERVER_URL = 'https://sparc.world'
} else if (process.env.NODE_ENV === 'production_testsite') {
  global.SERVER_URL = 'https://testsite.sparc.world'
} else {
  global.SERVER_URL = 'http://localhost:5000'
}

global.TAX = 5
global.TAX_FACTOR = global.TAX / 100
