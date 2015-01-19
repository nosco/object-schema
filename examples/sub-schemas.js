/****************************************************\
 ******************** WARNING!!!! *******************
 *       This is meant as a thorough example!       *
 * It does more or less the same as the test script *
\****************************************************/

var ObjectId = require('mongodb').ObjectID;
var DBRef = require('mongodb').DBRef;
var ObjectSchema = require('../index.js');

// A couple of filter functions to test with
var testLC = function(field, data) { return data[field].toLowerCase(); };
var testAuthorFullName = function(field, data) {
  var str = data['authorFirstName'];
  str += (data['authorFirstName'] && data['authorLastName']) ? ' ' : '';
  str += data['authorLastName'];
  return str;
};

// Just a helper to set strictness on all schemas at the same time
var setAllStrictnesses = function(strictness) {
  flagsSchema.setStrictness(strictness);
};

/**************************************\
 ** Here comes the interesting part! **
\**************************************/

// Create an object to test against
var testObject = {
  "flags" : { "votes" : [ '519b983d78c2bde0dc000011' ],
              "likes" : [ '519b983d78c2bde0dc000112',
                          ObjectId('519b983d78c2bde0dc000113') ]
            },
};

flagsSchema = new ObjectSchema({
  '*': {
    objectSchema: {
      '*': { type: 'object', instanceOf: ObjectId, filters: ['objectId'] }
    }
  }
});


// Create the "parent" ObjectSchema schema
testSchema = new ObjectSchema({
  flags: { objectSchema: flagsSchema },
}, {  });


setAllStrictnesses('strict');
var res = testSchema.validate(testObject, function(errors, result) {
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
