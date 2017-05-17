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
  .connectAsync(process.env.MONGO_URL + config.mongoDB);

app.post(route, function(req, res) {
  console.log(req.body);

  mongoConnection
    .then((db) => {
      return db.collection(`${req.params.param}-${date}`);
    })
    .then((col) => {
      hash.update(req.body['user-mac']);
      return col.insert({
        'user-mac': hash.digest('hex'),
        'local-timestamp-sec': req.body['local-timestamp-sec'],
        'avg': req.body.sum / req.body.count,
        'min': req.body.min,
        'max': req.body.max,
        'is-ap': !!+req.body['is-ap'],
      });
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

app.listen(config.port, function() {
  console.log('Example app listening on port %s!', config.port);
});
