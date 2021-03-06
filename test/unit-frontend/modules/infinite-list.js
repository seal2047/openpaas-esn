
'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The Infinite-list Angular module', function() {

  beforeEach(angular.mock.module('esn.infinite-list'));

  describe('infinite-list directive', function() {

    var $rootScope, $compile, element;

    function compileDirective(html) {
      element = $compile(html)($rootScope);

      $rootScope.$digest();

      return element;
    }

    function checkGeneratedElement(element, distance, disabled, immediateCheck) {
      var scope = element.find('[infinite-scroll]').isolateScope();

      expect(scope.infiniteScrollDistance).to.equal(distance);
      expect(scope.infiniteScrollDisabled).to.equal(disabled);
      expect(element.contents()[0].attributes.getNamedItem('infinite-scroll-immediate-check').value).to.equal(immediateCheck);
    }

    beforeEach(module('jadeTemplates'));

    beforeEach(inject(function(_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    }));

    it('should fill the isolated scope with values from attribute', function() {
      $rootScope.infiniteScrollDistance = 10;
      $rootScope.infiniteScrollDisabled = true;
      $rootScope.infiniteScrollImmediateCheck = false;

      compileDirective('<infinite-list infinite-scroll-distance="10" infinite-scroll-disabled="true" infinite-scroll-immediate-check="false"><span>Inner Element</span></infinite-list>');

      checkGeneratedElement(element, 10, true, 'false');
    });

    it('should fill the template with default values if no values were defined in the scope', inject(function(defaultConfiguration) {
      compileDirective('<infinite-list scroll-inside-container="true"><span>Inner Element</span></infinite-list>');

      checkGeneratedElement(element, defaultConfiguration.scrollDistance, defaultConfiguration.scrollDisabled, defaultConfiguration.scrollImmediateCheck);
    }));

    describe('The controller', function() {

      it('should expose a getElementsCount function, couting the DOM elements inside the infinite list', function() {
        compileDirective(
          '<infinite-list element-selector=".visible">' +
            '<div class="visible a">A</div>' +
            '<div class="visible b">B</div>' +
            '<div class="visible c">C</div>' +
          '</infinite-list>'
        );

        expect(element.controller('infiniteList').getElementsCount()).to.equal(3);

        element.find('.visible.c').remove();

        expect(element.controller('infiniteList').getElementsCount()).to.equal(2);
      });

    });

  });

});
