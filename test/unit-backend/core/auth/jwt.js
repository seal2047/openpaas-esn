'use strict';

var chai = require('chai');
var mockery = require('mockery');
var expect = chai.expect;

describe('The JWT based authentication module', function() {

  describe('the WebTokenConfig', function() {

    var jwt;

    beforeEach(function() {
      jwt = this.helpers.requireBackend('core/auth/jwt');
    });

    it('should throw an error when there is no privateKey in the config', function() {
      expect(function() {
        new jwt.WebTokenConfig({publicKey: 'public', algorithm: 'algo'});
      }).to.throw(Error);
    });

    it('should throw an error when there is no publicKey in the config', function() {
      expect(function() {
        new jwt.WebTokenConfig({privateKey: 'private', algorithm: 'algo'});
      }).to.throw(Error);
    });

    it('should throw an error when there is no algorithm in the config', function() {
      expect(function() {
        new jwt.WebTokenConfig({privateKey: 'private', publicKey: 'public'});
      }).to.throw(Error);
    });

    it('should have only expected fields when the config is valid', function() {
      var testee = new jwt.WebTokenConfig({
        privateKey: 'private',
        publicKey: 'public',
        algorithm: 'algo',
        not: 'expected'
      });
      expect(testee.privateKey).to.equal('private');
      expect(testee.publicKey).to.equal('public');
      expect(testee.algorithm).to.equal('algo');
      expect(testee.not).to.not.exist;
    });

  });

  describe('the getWebTokenConfig function', function() {
    it('should fail if esnConfig search fails', function(done) {
      var esnConfigMock = function(key) {
        expect(key).to.equal('jwt');
        return {
          get: function(callback) {
            return callback(new Error());
          }
        };
      };
      mockery.registerMock('../esn-config', esnConfigMock);
      var jwt = this.helpers.requireBackend('core/auth/jwt');
      jwt.getWebTokenConfig(function(err, config) {
        expect(err).to.exist;
        expect(config).to.not.exist;
        done();
      });
    });

    it('should return esnConfig for jwt key', function(done) {
      var expectedConfig = {
        privateKey: 'private key',
        publicKey: 'public key',
        algorithm: 'algo',
        expiresIn: '2 days'
      };
      var esnConfigMock = function(key) {
        expect(key).to.equal('jwt');
        return {
          get: function(callback) {
            return callback(null, expectedConfig);
          }
        };
      };
      mockery.registerMock('../esn-config', esnConfigMock);
      var jwt = this.helpers.requireBackend('core/auth/jwt');
      jwt.getWebTokenConfig(function(err, config) {
        expect(err).to.not.exist;
        expect(config).to.deep.equal(expectedConfig);
        done();
      });
    });

  });

  describe('the generateWebToken function', function() {
    it('should fail if no payload is provided', function() {
      var jwt = this.helpers.requireBackend('core/auth/jwt');
      jwt.generateWebToken(null, function(err, token) {
        expect(err).to.exist;
        expect(token).to.not.exist;
      });
    });

    it('should fail if webtoken config retrieval fails', function() {
      var payload = {user: 'me', email: 'me@me.me'};
      var jwt = this.helpers.requireBackend('core/auth/jwt');
      jwt.getWebTokenConfig = function(callback) {
        return callback(new Error());
      };
      jwt.generateWebToken(payload, function(err, token) {
        expect(err).to.exist;
        expect(token).to.not.exist;
      });
    });

    it('should return a webtoken', function() {
      var payload = {user: 'me', email: 'me@me.me'};
      var config = {privateKey: 'private key', algorithm: 'algo'};
      var token = 'aaabbbcccddd123456';

      var jwtLibMock = {
        sign: function(_payload, _privateKey, opts, callback) {
          expect(_payload).to.deep.equal(payload);
          expect(_privateKey).to.equal(config.privateKey);
          expect(opts).to.deep.equal({algorithm: 'algo'});
          return callback(token);
        }
      };
      mockery.registerMock('jsonwebtoken', jwtLibMock);

      var jwt = this.helpers.requireBackend('core/auth/jwt');
      jwt.getWebTokenConfig = function(callback) {
        return callback(null, config);
      };
      jwt.generateWebToken(payload, function(err, _token) {
        expect(err).to.not.exist;
        expect(_token).to.equal(token);
      });
    });
  });
});
