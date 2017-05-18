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
      let serverTimestamp = (new Date).getTime() / 1000;
      for(let i = 0; i < req.body.length; i++) {
        hash.update(req.body[i]['user-mac']);
        col.insert({
          'user-mac': hash.digest('hex'),
          'local-timestamp-sec': req.body[i]['local-timestamp-sec'],
          'server-timestamp-sec': serverTimestamp,
          'avg': req.body[i].sum / req.body[i].count,
          'min': req.body[i].min,
          'max': req.body[i].max,
          'is-ap': !!+req.body[i]['is-ap'],
        });
      }
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
