'use strict';

angular.module('hitsaOis').config(['$routeProvider', 'USER_ROLES', function ($routeProvider, USER_ROLES) {
  $routeProvider
      .when('/thesisProtocols', {
        templateUrl: 'fakePages/fake.html',
        controller: 'fakeController',
        controllerAs: 'controller',
        resolve: { translationLoaded: function($translate) { return $translate.onReady(); } },
        data: {
          authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_LOPPROTOKOLL]
        }
      })
      .when('/viewTimetable', {
        templateUrl: 'fakePages/fake.html',
        controller: 'fakeController',
        controllerAs: 'controller',
        resolve: { translationLoaded: function($translate) { return $translate.onReady(); } },
        data: {
          authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_TUNNIPLAAN]
        }
      })
      .when('/thesisTopicInput', {
        templateUrl: 'fakePages/fake.html',
        controller: 'fakeController',
        controllerAs: 'controller',
        resolve: { translationLoaded: function($translate) { return $translate.onReady(); } },
        data: {
          authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_LOPTEEMA]
        }
      })
      .when('/myData', {
        templateUrl: 'fakePages/fake.html',
        controller: 'fakeController',
        controllerAs: 'controller',
        resolve: { translationLoaDed: function($translate) { return $translate.onReady(); } },
        data: {
          authorizedRoles: [
            USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_OPETAJA,
            USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_OPPUR
          ]
        }
      })
      .when('/timetable', {
        templateUrl: 'fakePages/fake.html',
        controller: 'fakeController',
        controllerAs: 'controller',
        resolve: { translationLoaDed: function($translate) { return $translate.onReady(); } },
        data: {
          authorizedRoles: []
        }
      })
      .when('/myTimetable', {
        templateUrl: 'fakePages/fake.html',
        controller: 'fakeController',
        controllerAs: 'controller',
        resolve: { translationLoaDed: function($translate) { return $translate.onReady(); } },
        data: {
          authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_TUNNIPLAAN]
        }
      })
      .when('/loads', {
        templateUrl: 'fakePages/fake.html',
        controller: 'fakeController',
        controllerAs: 'controller',
        resolve: { translationLoaDed: function($translate) { return $translate.onReady(); } },
        data: {
          authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_KOORMUS]
        }
      })
      .when('/studentInfo', {
        templateUrl: 'fakePages/fake.html',
        controller: 'fakeController',
        controllerAs: 'controller',
        resolve: { translationLoaDed: function($translate) { return $translate.onReady(); } },
        data: {
          authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_A]
        }
      });
}]).controller('fakeController', ['$scope', 'QueryUtils', function ($scope, QueryUtils) {
    QueryUtils.endpoint("/fake/get505Error").search();
}]);
