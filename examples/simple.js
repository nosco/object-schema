var ObjectId = require('mongodb').ObjectID;
var ObjectSchema = require('../index.js');

// Create an object to test against
var testObject = {
  "_id" : ObjectId('529327e2675916232d000004'),
  "_version" : 3,
  "description" : "  Some description ",
  "nonsense": "ignore",
  "notDefined": "ignore or throw out"
};

// Create the ObjectSchema schema
testSchema = new ObjectSchema({
  _id: { required: true, instanceOf: ObjectId },
  _version: { required: true, type: 'number' },
  description: { required: true, filters: [ 'trim' ] },
  nonsense: { ignored: true }
}, {  });


testSchema.setStrictness('strict');
testSchema.validate(testObject, function(errors, result) {
  console.log('----------');
  console.log('  strict');
  console.log('----------');
  console.log('errors:');
  console.log(errors);
  console.log('----------');
  console.log('result:');
  console.log(result);
  console.log(' ');
});

testSchema.setStrictness('relaxed');
testSchema.validate(testObject, function(errors, result) {
  console.log('----------');
  console.log(' relaxed');
  console.log('----------');
  console.log('errors:');
  console.log(errors);
  console.log('----------');
  console.log('result:');
  console.log(result);
  console.log(' ');
});

testSchema.setStrictness('loose');
testSchema.validate(testObject, function(errors, result) {
  console.log('----------');
  console.log('  loose');
  console.log('----------');
  console.log('errors:');
  console.log(errors);
  console.log('----------');
  console.log('result:');
  console.log(result);
  console.log(' ');
});
