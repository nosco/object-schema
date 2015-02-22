/*
Running documentation of ObjectSchema

possible settings per field:
----------------------------
ignored: the field and value will be silently dropped
required: must not be undefined - specifiy more settings to expand on what it
            should be to pass
type: the type of object - i.e. the text string from typeof [object]
instanceOf: check that the value is an instance of the object in instanceOf
filters: filters to run on the value, before validating. Can be:
           text string - will check if it's a native string function or if
                         ObjectSchema has such a filter built in
           function - any custome function, that takes a value, manipulates it
                      and returns the result.
in: the value should exist in the given array.
default: a default value to set, if the field has no value.
regex: a regular expression to match
*/

var ObjectId = require('mongodb').ObjectID;
var DBRef = require('mongodb').DBRef;
require('extend-string');
var clone = require('clone');

/**
 * @todo Validate the schema - e.g. required and ignored not set on the same field
 */
var ObjectSchema = function(schemaDefinition, options) {
  if (options && options.strictness) {
    this.strictness = options.strictness;
  }
  this.definition = schemaDefinition;
};
module.exports = ObjectSchema;

/**
 * @todo A schema settings validator is needed here...
 */
ObjectSchema.prototype.setField = function(field, settings) {
  this.definition[field] = settings;
};
ObjectSchema.prototype.setFields = function(fields) {
  for (var field in fields) {
    this.definition[field] = fields[field];
  }
};
ObjectSchema.prototype.mergeFields = function(fields) {
  for (var field in fields) {
    this.addSettings(field, fields[field]);
  }
  this.definition = this._mergeObjects(this.definition, fields);
};
ObjectSchema.prototype.addSettings = function(field, settings) {
  if (!this.definition[field]) {
    this.definition[field] = settings;
  } else {
    this.definition[field] = this._mergeObjects(this.definition[field], settings);
  }
};

/**
 * Schema strictness
 * Possible values are:
 * strict: err on fields not defined in the schema
 * relaxed: ignore fields not defined in the schema
 * loose: let fields through, when they're not defined in the schema
 */
ObjectSchema.prototype.setStrictness = function(strictness) {
  this.strictness = strictness || 'strict'; // strict | relaxed | loose
  if (['strict', 'relaxed', 'loose'].indexOf(this.strictness) === -1) {
    throw new Error('You need to supply a valid strictness or leave as strict');
  }
};

/**
 * Not all validators are validators - some are manipulators...
 * Those should be run first, as they can change a value.
 * We don't want to pass a value, then change it to a non-passable value.
 */
ObjectSchema.prototype.validate = function(dataObject, errors, callback) {
  this.lastErrors = [];

  if (arguments.length < 3) {
    if (typeof errors === 'function') {
      callback = errors;
      errors = [];
    }
  }
  errors = errors || [];

  if (!dataObject) {
    callback([new Error('No dataObject supplied')], null);
    return false;
  }

  var testObject = clone(dataObject);

  if (testObject instanceof Array) var result = [];
  else var result = {};

  for (var field in this.definition) {
    var definition = this.definition[field];

    if (field === '*') {
      for (var dataField in testObject) {
        var res = this.runValidations(dataField, definition, testObject, errors);
        if (res !== undefined) {
          result[dataField] = res
        }
      }

    } else {
      var res = this.runValidations(field, definition, testObject, errors);
      if (res !== undefined) {
        result[field] = res
      }
    }
  }
  ;

  /** Run through the fields that are not in the schema */
  for (var field in testObject) {
    if (!this.definition[field] && !this.definition['*']) {
      if (this.strictness === 'strict') {
        errors.push({
          field: field,
          error: 'field not in definition'
        });
      } else if (this.strictness === 'loose') {
        result[field] = testObject[field];
      }
    }
  }

  if (errors.length) {
    this.lastErrors = errors;
  }

  /** If there is anything defined as an error - don't return the result! */
  if (this.strictness === 'strict' && errors.length) {
    result = false;
  }
  if (!errors.length) {
    errors = null;
  }

  if (callback) {
    callback(errors, result);
  }
  return result;
};


/** This is a seperated form validate, in order to only having it once */
ObjectSchema.prototype.runValidations = function(field, definition, testObject, errors) {
  var passed = true;

  if (definition.ignored) {
    return;
  }

  if ((this.strictness !== 'strict' || definition.optional) &&
    !definition.required &&
    (!testObject || typeof testObject[field] === 'undefined')) {

    if (definition.default) return definition.default;
    else return;
  }

  if (definition.objectSchema && typeof definition.objectSchema === 'object') {
    if (!(definition.objectSchema instanceof ObjectSchema)) {
      definition.objectSchema = new ObjectSchema(definition.objectSchema);
    }
    var subErrors = [];
    var result = definition.objectSchema.validate(testObject[field], subErrors);
    if (!result) {
      passed = false;
    } else {
      testObject[field] = result;
    }
    if (subErrors.length) {
      for (var i in subErrors) {
        subErrors[i].subField = subErrors[i].field;
        subErrors[i].field = field;
        errors.push(subErrors[i]);
      }
    }
  }

  /** Run theses before the tests, as these can render the value invalid */
  if (definition.filters) {
    this.definitionFilters(field, definition, testObject, errors);
  }
  if (definition.default) {
    this.definitionDefault(field, definition, testObject, errors);
  }


  if (definition.required) {
    if (!this.definitionRequired(field, definition, testObject, errors)) {
      passed = false;
    }
  }

  if (definition.in) {
    if (!this.definitionIn(field, definition, testObject, errors)) {
      passed = false;
    }
  }

  if (definition.type) {
    if (!this.definitionType(field, definition, testObject, errors)) {
      passed = false;
    }
  }

  if (definition.instanceOf && !definition.objectSchema) {
    if (!this.definitionInstanceOf(field, definition, testObject, errors)) {
      passed = false;
    }
  }

  if (definition.regex) {
    if (!this.definitionRegEx(field, definition, testObject, errors)) {
      passed = false;
    }
  }

  if (passed) {
    return testObject[field];
  }
};


/*************************\
 * DEFINITION VALIDATORS *
\*************************/
ObjectSchema.prototype.definitionFilters = function(field, definition, testObject, errors) {
  if (definition.filters) {
    if (definition.filters && typeof definition.filters !== 'object') {
      definition.filters = [definition.filters];
    }
    if (typeof definition.filters === 'object') {
      for (var i in definition.filters) {
        if (typeof definition.filters[i] === 'string') {
          var filterName = definition.filters[i];

          if (testObject[field][filterName] &&
            typeof testObject[field][filterName] === 'function') {
            testObject[field] = testObject[field][filterName]();

          } else if (this['filter' + filterName.upperCaseFirst()] &&
            typeof this['filter' + filterName.upperCaseFirst()] === 'function') {
            testObject[field] = this['filter' + filterName.upperCaseFirst()](field, testObject);
          }

        } else if (typeof definition.filters[i] === 'function') {
          testObject[field] = definition.filters[i](field, testObject);
        }
      }
    }
  }
};

/**
 * What is an empty value?
 * What it isn't: an empty value of the correct type...
 */
ObjectSchema.prototype.definitionDefault = function(field, definition, testObject, errors) {
  /** If no value is found, even after running filters, set the default */
  if (definition.default && typeof testObject[field] === 'undefined') {
    testObject[field] = definition.default;
  }
};


ObjectSchema.prototype.definitionRequired = function(field, definition, testObject, errors) {
  if (typeof testObject[field] === 'undefined') {
    errors.push({
      field: field,
      error: 'does not exist'
    });
    return false;
  }
  return true;
};

ObjectSchema.prototype.definitionIn = function(field, definition, testObject, errors) {
  if (typeof definition.in === 'object' && definition.in.length) {
    if (definition.in.indexOf(testObject[field]) === -1) {
      errors.push({
        field: field,
        error: 'value wasn\'t in array'
      });
      return false;
    }
  } else {
    return false;
  }
  return true;
};

ObjectSchema.prototype.definitionType = function(field, definition, testObject, errors) {
  if (typeof testObject[field] !== definition.type) {
    errors.push({
      field: field,
      error: 'wrong type'
    });
    return false;
  }
  return true;
};

ObjectSchema.prototype.definitionInstanceOf = function(field, definition, testObject, errors) {
  if (!(testObject[field] instanceof definition.instanceOf)) {
    errors.push({
      field: field,
      error: 'incorrect instance type'
    });
    return false;
  }
  return true;
};

ObjectSchema.prototype.definitionRegEx = function(field, definition, testObject, errors) {
  if (!testObject[field].match(definition.regex)) {
    errors.push({
      field: field,
      value: testObject[field],
      regex: definition.regex,
      error: 'value does not match regex'
    });
    return false;
  }
  return true;
};


/***********\
 * FILTERS *
\***********/
ObjectSchema.prototype.filterDate = function(field, dataObject) {
  if (dataObject[field]) {
    var date = new Date(dataObject[field]);
    if (date.toString() !== 'Invalid Date') {
      return date;
    }
  }
};

ObjectSchema.prototype.filterObjectID = ObjectSchema.prototype.filterObjectId = function(field, dataObject) {
  var objectId = dataObject[field];

  if (objectId instanceof ObjectId) {
    return objectId;
  }

  if (objectId.constructor.name.match(/^ObjectI(d|D)$/)) {
    return objectId;
  }

  if (ObjectId.isValid('' + objectId)) {
    return new ObjectId('' + objectId);
  }

  return objectId;
};

ObjectSchema.prototype.filterDbref = ObjectSchema.prototype.filterDbRef = ObjectSchema.prototype.filterDBRef = function(field, dataObject) {
  var dbRef = dataObject[field];

  if (dbRef instanceof DBRef) {
    return dbRef;
  }

  if (dbRef.constructor.name === 'DBRef') {
    return dbRef;
  }

  try {
    var namespace = dbRef.namespace || dbRef.collection || dbRef.$ref;
    var oid = dbRef.oid || dbRef._id || dbRef.id || dbRef.$id;
    var db = dbRef.db || dbRef.$db || dbRef.database || '';
    oid = ObjectId('' + oid);

    dbRef = new DBRef(namespace, oid, db);
  } catch ( e ) {}

  return dbRef;
};


/*************\
 * UTILITIES *
\*************/
ObjectSchema.prototype._mergeObjects = function() {
  var newObject = {};
  for (var objectIndex in arguments) {
    for (var objectKey in arguments[objectIndex]) {
      newObject[objectKey] = arguments[objectIndex][objectKey];
    }
  }
  return newObject;
};

