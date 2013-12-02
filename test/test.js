var ObjectId = require('mongodb').ObjectID;
var DBRef = require('mongodb').DBRef;
var ObjectSchema = require('../index.js');
var assert = require('chai').assert;

var testObject = {
  "_id" : ObjectId('529327e2675916232d000004'),
  "_version" : 3,
  "status" : "published",
  "author" : new DBRef(),
  "authorBiography" : null,
  "authorImage" : "/img/thumb-529327e2675916232d000004.png",
  "authorFirstName": "Some",
  "authorLastName": "Name",
  "author_id" : '519b983d78c2bde0dc000012',
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

var templateSchema = undefined;
var templateItemsSchema = undefined;
var flagsSchema = undefined;
var testSchema = undefined;

var testLC = function(field, data) { return data[field].toLowerCase(); };
var testAuthorFullName = function(field, data) {
  var str = data['authorFirstName'];
  str += (data['authorFirstName'] && data['authorLastName']) ? ' ' : '';
  str += data['authorLastName'];
  return str;
};

// Helper to set strictness on all schemas at the same time
var setAllStrictnesses = function(strictness) {
  templateSchema.setStrictness(strictness);
  templateItemsSchema.setStrictness(strictness);
  flagsSchema.setStrictness(strictness);
  testSchema.setStrictness(strictness);
};

describe('ObjectSchema\'s individual validator methods', function() {
  var _idDefinition = { required: true, type: 'object', instanceOf: ObjectId,
                        filters: ['trim', 'objectId'] };
  var _idTestObject = { _id: '529327b9675916232d000001' };

  var definition = { required: true, type: 'object', instanceOf: ObjectId,
                     filters: [ 'trim', testLC ],
                     in: [ 'published', 'draft' ],
                     default: 'default value',
                     regex: /some description/i };

  describe('ObjectSchema.definitionFilters (ObjectId) - setting:filters', function() {
    it('should return correct ObjectId after filters', function() {
      var errors = [];
      ObjectSchema.prototype.definitionFilters('_id', _idDefinition, _idTestObject, errors);
      assert.equal(true, _idTestObject['_id'].equals(ObjectId('529327b9675916232d000001')), 'result should be a valid ObjectId');
    });
  });

  describe('ObjectSchema.definitionFilters - setting:filters', function() {
    it('should return correct values after filters', function() {
      var errors = [];
      ObjectSchema.prototype.definitionFilters('description', definition, testObject, errors);
      assert.equal(testObject['description'], 'some description', 'result should be trimmed and lowercased');
    });
  });

  describe('ObjectSchema.default - setting:default', function() {
    it('should set the field to the default value, if empty or non-existent', function() {
      var errors = [];
      ObjectSchema.prototype.definitionDefault('noSuchField', definition, testObject, errors);
      assert.equal(testObject['noSuchField'], 'default value', 'result should be the default value');
    });
  });

  describe('ObjectSchema.definitionRequired - setting:required', function() {
    it('should validate a required field that has a value', function() {
      var errors = [];
      ObjectSchema.prototype.definitionRequired('_id', definition, testObject, errors);
      assert.equal(errors.length, 0, 'there should be no errors in the error array');
    });

    it('should throw an error, when a required field has no value', function() {
      var errors = [];
      ObjectSchema.prototype.definitionRequired('_no_such_field', definition, testObject, errors);
      assert.equal(errors.length, 1, 'there should be 1 error in the error array');
    });
  });

  describe('ObjectSchema.definitionIn - setting:in', function() {
    it('should validate when the value is in the check array', function() {
      var errors = [];
      ObjectSchema.prototype.definitionIn('status', definition, testObject, errors);
      assert.equal(errors.length, 0, 'there should be no errors in the error array');
    });

    it('should throw an error, when the value is not in the check array', function() {
      var errors = [];
      ObjectSchema.prototype.definitionIn('_version', definition, testObject, errors);
      assert.equal(errors.length, 1, 'there should be 1 error in the error array');
    });
  });

  describe('ObjectSchema.definitionType - setting:type', function() {
    it('should validate a correct type check', function() {
      var errors = [];
      ObjectSchema.prototype.definitionType('_id', definition, testObject, errors);
      assert.equal(errors.length, 0, 'there should be no errors in the error array');
    });

    it('should throw an error, when the type is wrong', function() {
      var errors = [];
      ObjectSchema.prototype.definitionType('_description', definition, testObject, errors);
      assert.equal(errors.length, 1, 'there should be 1 error in the error array');
    });
  });

  describe('ObjectSchema.definitionInstanceOf - setting:instanceOf', function() {
    it('should validate a correct instanceof check', function() {
      var errors = [];
      ObjectSchema.prototype.definitionInstanceOf('_id', definition, testObject, errors);
      assert.equal(errors.length, 0, 'there should be no errors in the error array');
    });

    it('should throw an error, when the instanceof is wrong', function() {
      var errors = [];
      ObjectSchema.prototype.definitionInstanceOf('_description', definition, testObject, errors);
      assert.equal(errors.length, 1, 'there should be 1 error in the error array');
    });
  });

  describe('ObjectSchema.definitionRegEx - setting:regex', function() {
    it('should validate a correct regex match', function() {
      var errors = [];
      ObjectSchema.prototype.definitionRegEx('description', definition, testObject, errors);
      assert.equal(errors.length, 0, 'there should be no errors in the error array');
    });

    it('should throw an error, when the regex does not match', function() {
      var errors = [];
      ObjectSchema.prototype.definitionRegEx('status', definition, testObject, errors);
      assert.equal(errors.length, 1, 'there should be 1 error in the error array');
    });
  });

});


describe('ObjectSchema', function() {
  it('should be able to create subSchemas', function() {


    // This is the schema for each item of the template
    templateItemsSchema = new ObjectSchema({
      'title': { type: 'string', required: true },
      'id': { type: 'string', required: true },
      'description': { type: 'string', regex: /^.+/i }
    });

    // Each field in a schema should be a valid templateItemsSchema
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


    // Now assert something about the schemas
    assert.instanceOf(flagsSchema, ObjectSchema,
                      'flagsSchema is an instance of ObjectSchema');
    assert.instanceOf(templateItemsSchema, ObjectSchema,
                      'templateItemsSchema is an instance of ObjectSchema');
    assert.instanceOf(templateSchema, ObjectSchema,
                      'templateSchema is an instance of ObjectSchema');
  });

  it('should be able to create a schema with subschemas', function() {
    // Create the "parent" ObjectSchema schema
    testSchema = new ObjectSchema({
      _id: { required: true, instanceOf: ObjectId },
      _version: { required: true, type: 'number' },
      description: { required: true, filters: [ 'trim', testLC ],
                     regex: /some description/ },
      counters: { ignored: true },
      authorBiography: { ignored: true },
      authorImage: { ignored: true },
      author: { instanceOf: DBRef },
      authorFullName: { required: true, filters: [testAuthorFullName] },
      authorFirstName: { ignored: true },
      authorLastName: { ignored: true },
      flags: { objectSchema: flagsSchema },
      template: { objectSchema: templateSchema }
    }, {  });

    // Testing setting and adding to a field...
    testSchema.setField('author_id', { required: true, instanceOf: ObjectId });
    testSchema.addSettings('author_id', { filters: ['objectId'] });

    assert.instanceOf(testSchema, ObjectSchema, 'testSchema is an instance of ObjectSchema');
  });

  it('should NOT validate test object against strict', function(done) {
    setAllStrictnesses('strict');
    testSchema.validate(testObject, function(errors, result) {
      assert.equal(result, false, 'testSchema result should be false');
      assert.lengthOf(errors, 5, 'testSchema should have 27 errors');
      done();
    });
  });

  it('should validate test object against relaxed', function(done) {
    setAllStrictnesses('relaxed');
    testSchema.validate(testObject, function(errors, result) {
      assert.notEqual(result, false, 'testSchema result should not be false');
      assert.isUndefined(result.notDefined, 'testSchema should throw out undefined fields');
      assert.equal(errors.length, 0, 'testSchema lives up to ObjectSchema');
      done();
    });
  });

  it('should validate test object against loose', function(done) {
    setAllStrictnesses('loose');
    testSchema.validate(testObject, function(errors, result) {
      assert.notEqual(result, false, 'testSchema should not return false');
      assert.equal(result.notDefined, "ignore or throw out", 'testSchema should leave undefined fields alone');
      assert.equal(errors.length, 0, 'testSchema lives up to ObjectSchema');
      done();
    });
  });

});
