'use strict';

angular.module('linagora.esn.contact')
  .controller('newContactController', ['$scope', '$route', '$location', '$alert', 'contactsService', 'ContactsHelper', 'notificationFactory', function($scope, $route, $location, $alert, contactsService, ContactsHelper, notificationFactory) {
    $scope.bookId = $route.current.params.bookId;
    $scope.contact = {};
    $scope.calling = false;

    $scope.close = function() {
      $location.path('/contact');
    };

    function _displayError(err) {
      $alert({
        content: err,
        type: 'danger',
        show: true,
        position: 'bottom',
        container: '.create-contact-error-container',
        duration: '3',
        animation: 'am-flip-x'
      });
    }

    $scope.accept = function() {

      if ($scope.calling) {
        return;
      }

      var formattedName = ContactsHelper.getFormattedName($scope.contact);
      if (!formattedName) {
        return _displayError('Please fill at least a field');
      }

      $scope.displayName = formattedName;

      $scope.calling = true;
      var vcard = contactsService.shellToVCARD($scope.contact);
      var path = '/addressbooks/' + $scope.bookId + '/contacts';
      contactsService.create(path, vcard).then(function() {
        $scope.close();
        notificationFactory.weakInfo('Contact creation', 'Successfully created ' + formattedName);
      }, function(err) {
        notificationFactory.weakError('Contact creation', err.message || 'Something went wrong');
      }).finally (function() {
        $scope.calling = false;
      });
    };
  }])
  .controller('showContactController', ['$scope', '$route', '$location', 'contactsService', 'notificationFactory', function($scope, $route, $location, contactsService, notificationFactory) {
    $scope.bookId = $route.current.params.bookId;
    $scope.cardId = $route.current.params.cardId;
    $scope.contact = {};

    $scope.close = function() {
      $location.path('/contacts');
    };

    $scope.accept = function() {
      var vcard = contactsService.shellToVCARD($scope.contact);
      contactsService.modify($scope.contact.path, vcard, $scope.contact.etag).then(function() {
        $scope.close();
        notificationFactory.weakInfo('Contact modification success', 'Successfully modified the new contact');
      }).catch (function(err) {
        notificationFactory.weakError('Contact modification failure', err.message);
      });
    };

    $scope.init = function() {
      var cardUrl = '/addressbooks/' + $scope.bookId + '/contacts/' + $scope.cardId + '.vcf';
      contactsService.getCard(cardUrl).then(function(card) {
        $scope.contact = card;
      });
    };

    $scope.init();
  }])
  .controller('contactsListController', ['$timeout', '$log', '$scope', '$location', '$alert', 'contactsService', 'alphaCategoryService', 'ALPHA_ITEMS', 'user', function($timeout, $log, $scope, $location, $alert, contactsService, CategoryService, ALPHA_ITEMS, user) {
    $scope.user = user;
    $scope.bookId = $scope.user._id;
    $scope.keys = ALPHA_ITEMS;
    $scope.sortBy = 'firstName';
    $scope.prefix = 'contact-index';
    $scope.showMenu = false;

    $scope.categories = new CategoryService({keys: $scope.keys, sortBy: $scope.sortBy, keepAll: true, keepAllKey: '#'});

    function displayError(message) {
      $alert({
        content: message,
        type: 'danger',
        show: true,
        position: 'bottom',
        container: '.list-contact-error-container',
        duration: '3',
        animation: 'am-flip-x'
      });
    }

    $scope.loadContacts = function() {
      var path = '/addressbooks/' + $scope.bookId + '/contacts.json';
      contactsService.list(path).then(function(data) {
        $scope.categories.addItems(data);
        $scope.sorted_contacts = $scope.categories.get();
      }, function(err) {
        $log.error('Can not get contacts', err);
        displayError('Can not get contacts');
      });

      $scope.openContactCreation = function() {
        $location.path('/contact/new/' + $scope.bookId);
      };

      $scope.$on('contact:deleted', function(event, contact) {
        $scope.categories.removeItem(contact);
      });
    };

    $scope.loadContacts();

    $scope.$on('ngRepeatFinished', function() {
      $scope.showMenu = true;
    });
  }])
  .controller('contactAvatarModalController', ['$scope', 'selectionService', function($scope, selectionService) {
    $scope.imageSelected = function() {
      return !!selectionService.getImage();
    };

    $scope.saveContactAvatar = function() {
      if (selectionService.getImage()) {
        $scope.loading = true;
        selectionService.getBlob('image/png', function(blob) {
          var reader = new FileReader();
          reader.onloadend = function() {
            $scope.contact.photo = reader.result;
            selectionService.clear();
            $scope.loading = false;
            $scope.modal.hide();
            $scope.$apply();
          };
          reader.readAsDataURL(blob);
        });
      }
    };
  }]);