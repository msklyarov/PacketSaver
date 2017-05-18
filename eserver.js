'use strict';

const hash = require('crypto').createHash('sha256');
const dateFormat = require('dateformat');
const app = require('express')();
const bodyParser = require('body-parser');
const Promise = require('bluebird');
const mongoClient = Promise.promisifyAll(require('mongodb').MongoClient);
const config = require('./config');

const date = dateFormat(new Date(), 'yyyy-mm-dd');
const route = `/api/:version${config.routePart}:param`;

console.log('Listening route: \'%s\' at port: %d', route, config.port);
console.log('Date: %s', date);

app.use(bodyParser.json());

app.get(route, function(req, res) {
  res.send('Use POST method.');
});

const mongoConnection = mongoClient
  .connectAsync(config.mongoUrl);

mongoConnection
  .then(() => {
    app.listen(config.port, function() {
      console.log('Example app listening on port %s!', config.port);
    });
  });

app.post(route, function(req, res) {
  console.log(req.body);

  mongoConnection
    .then((db) => {
      return db.collection(`${req.params.param}-${date}`);
    })
    .then((col) => {
      let bulk = col.initializeUnorderedBulkOp();
      let serverTimestamp = (new Date).getTime() / 1000;

      req.body.forEach(function(item) {
        hash.update(item['user-mac']);
        bulk.insert({
          'user-mac': hash.digest('hex'),
          'local-timestamp-sec': item['local-timestamp-sec'],
          'server-timestamp-sec': serverTimestamp,
          'avg': item.sum / item.count,
          'min': item.min,
          'max': item.max,
          'is-ap': !!+item['is-ap'],
        });
      });
      bulk.execute();
    })
    .then(() => {
      let responseStatus = 'Ok';
      console.log(responseStatus);
      res.send(responseStatus);
    })
    .catch((err) => {
      console.error(err);
      res.send(err);
    });
});
