'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var utils = require('./utils');
var CONSTANTS = require('./constants');
var pubsub = require('../../core/pubsub').local;
var domainModule = require('../domain');
var _ = require('lodash');

var defaultLimit = 50;
var defaultOffset = 0;

function joinDomain(user, domain, callback) {
  if (!user) {
    return callback(new Error('User must not be null'));
  }
  if (!domain) {
    return callback(new Error('Domain must not be null'));
  }
  var domainId = domain._id || domain;

  function validateDomains(domain) {
    return user.domains.every(function(d) {return d.domain_id !== domain;});
  }

  if (!validateDomains(domainId)) {
    return callback(new Error('User is already in domain ' + domainId));
  } else {
    return User.findOneAndUpdate({_id: user._id}, {$push: {domains: {domain_id: domain}}}, { new: true }, function(err, result) {
      if (!err && result) {
        pubsub.topic(CONSTANTS.EVENTS.userUpdated).publish(result);
      }
      return callback(err, result);
    });
  }
}

function isMemberOfDomain(user, domain) {
  if (!user) {
    throw new Error('User must not be null');
  }

  if (!domain) {
    throw new Error('Domain must not be null');
  }
  var domainId = domain._id || domain;
  return user.domains.some(function(d) {
    return d.domain_id.equals(domainId);
  });
}

function getUserDomains(user, callback) {
  if (!user) {
    return callback(new Error('User is mandatory'));
  }

  var id = user._id || user;
  return User.findById(id).populate('domains.domain_id', null, 'Domain').exec(function(err, result) {
    if (err) {
      return callback(err);
    }

    if (!result) {
      return callback();
    }

    if (result.domains && result.domains.length > 0) {
      var domains = [];
      result.domains.forEach(function(domain) {
        domains.push(domain.domain_id);
      });
      return callback(null, domains);
    }
    return callback();
  });
}

/**
 * Get all users in a domain.
 *
 * @param {Domain[], ObjectId[]} domains array of domain where search users
 * @param {object} query - Hash with 'limit' and 'offset' for pagination.
 *  'not_in_community' to return only members who are not in this community and no pending request with it.
 * @param {function} cb - as fn(err, result) with result: { total_count: number, list: [User1, User2, ...] }
 */
function getUsersList(domains, query, cb) {
  if (!domains) {
    return cb(new Error('Domains is mandatory'));
  }
  if (!(domains instanceof Array)) {
    return cb(new Error('Domains must be an array'));
  }
  if (domains.length === 0) {
    return cb(new Error('At least one domain is mandatory'));
  }

  query = query || { limit: defaultLimit, offset: defaultOffset };

  var collaboration = query.not_in_collaboration;
  var limit = query.limit;
  if (collaboration) {
    query.limit = null;
  }

  var domainIds = domains.map(function(domain) {
    return domain._id || domain;
  });

  return User.find().where('domains.domain_id').in(domainIds).count().exec(function(err, count) {
    if (err) {
      return cb(new Error('Cannot count users of domain'));
    }

    User.find().where('domains.domain_id').in(domainIds).skip(+query.offset).limit(+query.limit).sort({firstname: 'asc'}).exec(function(err, list) {
      if (err) {
        return cb(new Error('Cannot execute find request correctly on domains collection'));
      }

      if (collaboration) {
        utils.filterByNotInCollaborationAndNoMembershipRequest(list, collaboration, function(err, results) {
          if (err) {
            return cb(err);
          }
          var filterCount = results.length;
          if (filterCount > limit) {
            results = results.slice(0, limit);
          }
          return cb(null, {
            total_count: filterCount,
            list: results
          });
        });
      } else {
        return cb(null, {
          total_count: count,
          list: list
        });
      }
    });
  });
}

/**
 * Get all administrators in a domain
 *
 * @param {Domain} domain object of domain where search administrators
 * @param {function} callback - as fn(err, results) with results: [Admin1, Admin2, ...]
 */
function getAdministrators(domain, callback) {
  if (!domain) {
    return callback(new Error('Domain must not be null'));
  }

  var administratorIds = domainModule.getDomainAdministrators(domain)
    .map(function(administrator) {
      return administrator.user_id;
    });

  return User.find().where('_id').in(administratorIds)
    .exec(callback);
}

/**
 * Add one or more domain administrators to current domain
 * @param {Domain} domain A domain instance
 * @param {Array|ObjectId} userIds  An array of user's ID or a user's ID
 * @param {Function}       callback A callback(err, resp) function
 */
function addDomainAdministrator(domain, userIds, callback) {
  if (!domain) {
    return callback(new Error('domain cannot be null'));
  }

  if (!userIds) {
    return callback(new Error('userIds cannot be null'));
  }

  userIds = Array.isArray(userIds) ? userIds : [userIds];

  var administrators = domainModule.getDomainAdministrators(domain);

  userIds.forEach(function(userId) {
    var alreadyAdded = _.find(administrators, function(administrator) {
      return String(administrator.user_id) === String(userId);
    });

    if (!alreadyAdded) {
      administrators.push({ user_id: userId });
    }
  });
  domain.administrators = administrators;
  domain.administrator = null;

  domain.save(callback);
}

/**
 * Remove one or more administrators from a domain
 * @param  {Domain}   domain                   The domain object
 * @param  {Array|ObjectId}   administratorIds Administrator ID or an array of
 *                                             administrator ID
 * @param  {Function} callback                 The callback(err, resp) function
 */
function removeDomainAdministrator(domain, administratorIds, callback) {
  if (!domain) {
    return callback(new Error('domain cannot be null'));
  }

  if (!administratorIds) {
    return callback(new Error('administratorIds cannot be null'));
  }

  administratorIds = Array.isArray(administratorIds) ? administratorIds : [administratorIds];

  var administrators = domainModule.getDomainAdministrators(domain);

  administratorIds.forEach(function(administratorId) {
    _.remove(administrators, function(administrator) {
      return String(administrator.user_id) === String(administratorId);
    });
  });

  if (administrators.length) {
    domain.administrators = administrators;
    domain.administrator = null;

    return domain.save(callback);
  }

  return callback(new Error('A domain must have at least one administrator'));
}

module.exports = {
  joinDomain: joinDomain,
  isMemberOfDomain: isMemberOfDomain,
  getUserDomains: getUserDomains,
  getUsersList: getUsersList,
  getUsersSearch: require('./search').searchByDomain,
  getAdministrators: getAdministrators,
  addDomainAdministrator: addDomainAdministrator,
  removeDomainAdministrator: removeDomainAdministrator
};
