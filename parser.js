const dateFormat = require('dateformat');
const Promise = require('bluebird');
const mongoClient = Promise.promisifyAll(require('mongodb').MongoClient);
const config = require('./config');

const dateFormatTemplate = 'yyyy-mm-dd';

const date = dateFormat(new Date(), dateFormatTemplate);
const inputCollectionKey =
  `${config.paramName}_${config.collectionName}_${date}`;
const outputCollectionKey =
  `${config.outputCollectionPrefix}_${inputCollectionKey}`;

console.log(outputCollectionKey);

let mongoDb;
mongoClient
  .connectAsync(config.mongoUrl)
  .then((db) => {
    mongoDb = db;
  })
  .then(() => {
    return mongoDb.collection(outputCollectionKey)
      .deleteMany({find: {}});
  })
  .then(() => {
    return mongoDb.collection(inputCollectionKey).aggregate(
      [
        {
          $sort: {'local-timestamp-sec': 1},
        },
        {
          $group: {
            _id: '$user-mac',
            data: {
              $push: {
                'local-timestamp-sec': '$local-timestamp-sec',
                'server-timestamp-sec': '$server-timestamp-sec',
                'avg': '$avg',
                'min': '$min',
                'max': '$max',
                'is-ap': '$is-ap',
              },
            },
          },
        },
        {
          $out: outputCollectionKey,
        },
      ]
    ).next(function(err) {
      if (err) {
        console.log(err);
      }
      mongoDb.close();
    });
  })
  .catch((err) => {
    console.log(err);
    mongoDb.close();
  });
