const crypto = require('crypto');
const dateFormat = require('dateformat');
const app = require('express')();
const bodyParser = require('body-parser');
const Promise = require('bluebird');
const mongoClient = Promise.promisifyAll(require('mongodb').MongoClient);
const config = require('./config');

const dateFormatTemplate = 'yyyy-mm-dd';
const route = `/api/:version${config.routePart}:param`;

console.log('Listening route: \'%s\' at port: %d', route, config.port);

app.use(bodyParser.json());

app.get(route, function(req, res) {
  res.send('Use POST method.');
});

let mongoDb;
mongoClient
  .connectAsync(config.mongoUrl)
  .then((db) => {
    mongoDb = db;
  })
  .then(() => {
    app.listen(config.port, function() {
      console.log('Example app listening on port %s!', config.port);
    });
  });

app.post(route, function(req, res) {
  console.log(req.body);

  const col = getCollection(req.params.param);
  let bulk = col.initializeUnorderedBulkOp();
  let serverTimestamp = (new Date).getTime() / 1000;

  let isRecordInserted = false;
  req.body.forEach(function(item) {
    if (dateFormat(
      new Date(item['local-timestamp']), dateFormatTemplate) ===
        '1970-01-01') {
      return;
    }

    bulk.insert({
      'user-mac': crypto
        .createHash('sha256')
        .update(item['user-mac'])
        .update(config.salt)
        .digest('hex'),
      'local-timestamp-sec': item['local-timestamp-sec'],
      'server-timestamp-sec': serverTimestamp,
      'avg': item.sum / item.count,
      'min': item.min,
      'max': item.max,
      'is-ap': !!+item['is-ap'],
    });

    isRecordInserted = true;
  });

  if (isRecordInserted) {
    bulk.execute()
      .then(() => {
        console.log('Ok');
        res.sendStatus(200);
      })
      .catch((err) => {
        console.error(err);
        res.sendStatus(500);
      });
  } else {
    console.log('Ok');
    res.sendStatus(200);
  }
});

const collections = {};

/**
 * Gets cached collection
 * @param {string} param The string key.
 * @return {object} The collection item.
 */
const getCollection = (param) => {
  const date = dateFormat(new Date(), dateFormatTemplate);
  console.log('Param: %s, Collection name: %s, date: %s',
    param, config.collectionName, date);
  const collectionKey = `${param}_${config.collectionName}_${date}`;

  const collection = collections[collectionKey];
  if (collection) {
    return collection;
  }

  collections[collectionKey] = mongoDb.collection(collectionKey);
  return collections[collectionKey];
};
