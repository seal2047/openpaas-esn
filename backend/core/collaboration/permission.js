'use strict';

var collaborationModule = require('./index');
var userHelpers = require('../../helpers/user');

var READABLES = ['open', 'restricted'];

module.exports.isPubliclyReadable = function(collaboration) {
  if (!collaboration || !collaboration.type) {
    return false;
  }
  return READABLES.indexOf(collaboration.type) !== -1;
};

module.exports.canWrite = function(collaboration, tuple, callback) {
  if (!collaboration || !collaboration.type) {
    return callback(new Error('collaboration object is required'));
  }

  if (!tuple) {
    // Tuple is required because the tuple objectType determines the permission
    return callback(new Error('Tuple is required'));
  }
  if (tuple.objectType === 'user') {
    userHelpers.isInternal(tuple.id, function(err, isInternal) {
      if (err) {
        return callback(err);
      }
      // If the user is internal then he can participate in open collaborations
      if (isInternal && collaboration.type === 'open') {
        return callback(null, true);
      } else {
        // For other collaboration type he must be a member
        return collaborationModule.isMember(collaboration, tuple, callback);
      }
    });
  } else {
    if (collaboration.type === 'open') {
      return callback(null, true);
    }
    return collaborationModule.isMember(collaboration, tuple, callback);
  }
};

module.exports.supportsMemberShipRequests = function(collaboration) {
  if (!collaboration || !collaboration.type) {
    return false;
  }
  return collaboration.type === 'restricted' || collaboration.type === 'private';
};

module.exports.canFind = function(collaboration, tuple, callback) {
  if (!collaboration || !collaboration.type) {
    return callback(new Error('Collaboration object is required'));
  }

  if (!tuple) {
    // Tuple is required because the tuple objectType determines the permission
    return callback(new Error('Tuple is required'));
  }
  if (tuple.objectType === 'user') {
    userHelpers.isInternal(tuple.id, function(err, isInternal) {
      if (err) {
        return callback(err);
      }
      // If the user is internal then he can see open, restricted and private
      if (isInternal && collaboration.type !== 'confidential') {
        return callback(null, true);
      }
      // For confidential collaboration type he must be a member to see it
      return collaborationModule.isMember(collaboration, tuple, callback);
    });
  } else {
    if (collaboration.type !== 'confidential') {
      return callback(null, true);
    }
    return collaborationModule.isMember(collaboration, tuple, callback);
  }
};