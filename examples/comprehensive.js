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
  templateSchema.setStrictness(strictness);
  templateItemsSchema.setStrictness(strictness);
  flagsSchema.setStrictness(strictness);
  testSchema.setStrictness(strictness);
};

/**************************************\
 ** Here comes the interesting part! **
\**************************************/

// Create an object to test against
var testObject = {
  "_id" : ObjectId('529327e2675916232d000004'),
  "_version" : 3,
  "status" : "published",
  "author" : new DBRef(),
  "authorBiography" : null,
  "authorImage" : "/img/thumb-529327e2675916232d000004.png",
  "authorFirstName": "Some",
  "authorLastName": "Name",
  "author_id" : ObjectId('519b983d78c2bde0dc000012'),
  "counters" : {
    "books" : 5
  },
  "description" : "Some description ",
  "flags" : { "votes" : [ '519b983d78c2bde0dc000012' ],
              "likes" : [ ObjectId('519b983d78c2bde0dc000112'),
                          ObjectId('519b983d78c2bde0dc000113') ]
            },
  "image" : "/img/img-529327b9675916232d000001.jpg",
  "template" : [ { "title" : "Title", "id" : "title", "description" : "some some" },
                 { "title" : "Title 2", "id" : "title2", "description" : "different" }],
  "title" : "Title 2",
  "notDefined": "ignore or throw out"
};


// This is the schema for each item of the template
templateItemsSchema = new ObjectSchema({
  'title': { type: 'string', required: true },
  'id': { type: 'string', required: true },
  'description': { type: 'string', regex: /^.+/i }
});

// Each field in the template schema should be a valid templateItemsSchema
templateSchema = new ObjectSchema({
  '*': { objectSchema: templateItemsSchema }
});


// All fields in a flags schema consists of an array of ObjectIds
// This is a new schema to match each of the arrays values
// The template above, could also have been constructed like this
// Flags looks like this:
//   "flags" : { "votes" : [ '519b983d78c2bde0dc000012' ],
//               "likes" : [ '519b983d78c2bde0dc000112' ] }
// Do you see this pattern?:
//      *           *       object, ObjectId, 'objectId'
flagsSchema = new ObjectSchema({
  '*': { objectSchema: { '*': { type: 'object',
  instanceOf: ObjectId,
  filters: ['objectId'] } } }
});


// Create the "parent" ObjectSchema schema
testSchema = new ObjectSchema({
  _id: { required: true, instanceOf: ObjectId },
  _version: { required: true, type: 'number' },
  description: { required: true, filters: [ 'trim', testLC ],
  regex: /some description/ },
  counters: { ignored: true },
  authorBiography: { ignored: true },
  authorImage: { ignored: true },
  author_id: { ignored: true },
  author: { instanceOf: DBRef },
  authorFullName: { required: true, filters: [testAuthorFullName] },
  authorFirstName: { ignored: true },
  authorLastName: { ignored: true },
  nonExising: { optional: true }, // optional is only valid with strict
  flags: { objectSchema: flagsSchema },
  template: { objectSchema: templateSchema },
  unsetField: { default: { my: { little: 'object' } } }
}, {  });


setAllStrictnesses('strict');
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

setAllStrictnesses('relaxed');
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

setAllStrictnesses('loose');
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
