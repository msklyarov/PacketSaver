module.exports = {
  routePart: '/foo/bar/',
  port: 8080,
  mongoUrl: process.env.MONGO_URL,
  collectionName: 'NewCollection',
  salt: 'sd23SDF2sz12_$%',
  outputCollectionPrefix: 'parsed',
  paramName: process.env.COLLECTION_PARAM,
};
