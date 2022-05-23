'use strict';

angular.module('hitsaOis').config(['$routeProvider', 'USER_ROLES', function ($routeProvider, USER_ROLES) {
  $routeProvider
    .when('/applications', {
        templateUrl: 'application/application.list.html',
        controller: 'SimpleListController',
        controllerAs: 'controller',
        resolve: {
          translationLoaded: function($translate) { return $translate.onReady(); } ,
          auth: function (AuthResolver) { return AuthResolver.resolve(); },
          clMapping: function() { return {type: 'AVALDUS_LIIK', status: 'AVALDUS_STAATUS'}; },
          params: function() { return {order: '-inserted'}; },
          url: function() { return '/applications'; }
        },
        data: {
          authorizedRoles: function(Session, roles) {
            // checks if admin and leading teacher have view right (regular teacher needs to be student group teacher aswell)
            // checks if admin, leading teacher or regular teacher is in any application committee when view rights are missing
            return (['ROLL_A', 'ROLL_J'].indexOf(Session.roleCode) !== -1 && roles.indexOf(USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_AVALDUS) !== -1) || 
                    (Session.inApplicationCommittee && ['ROLL_A', 'ROLL_J', 'ROLL_O'].indexOf(Session.roleCode) !== -1) ||
                    ((Session.teacherGroupIds || []).length > 0 && Session.roleCode === 'ROLL_O' && roles.indexOf(USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_AVALDUS) !== -1);
          }
        }
      })
      .when('/applications/new', {
        templateUrl: 'application/application.html',
        controller: 'ApplicationController',
        controllerAs: 'controller',
        resolve: {
          translationLoaded: function($translate) { return $translate.onReady(); } ,
          auth: function (AuthResolver) { return AuthResolver.resolve(); },
          isCreate: function (){return true;}
        },
        data: {
          authorizedRoles: function(Session, roles) {
            return (Session.roleCode === 'ROLL_A' || Session.roleCode === 'ROLL_T' || ((Session.teacherGroupIds || []).length > 0 && Session.roleCode === 'ROLL_O')) &&
              roles.indexOf(USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_AVALDUS) !== -1;
          }
        }
      })
      .when('/applications/:id/:action', {
        templateUrl: function(urlAttrs) {
          return urlAttrs.action === 'edit' ? 'application/application.html' : 'application/application.view.html';
        },
        controller: 'ApplicationController',
        controllerAs: 'controller',
        resolve: {
          translationLoaded: function($translate) { return $translate.onReady(); },
          auth: function (AuthResolver) { return AuthResolver.resolve(); },
          entity: function(QueryUtils, $route) {
            return QueryUtils.endpoint('/applications').get({id: $route.current.params.id}).$promise;
          },
          isView: function ($route){
            return $route.current.params.action === 'view';
          }
        },
        data: {
          authorizedRoles: function(Session, roles) {
            // Light check - specific application relations are checked in controller
            // checks if user has view right (regular teacher needs to be student group teacher)
            // checks if admin, leading teacher or regular teacher is in any application committee (view rights can be missing)
            return (Session.inApplicationCommittee && ['ROLL_A', 'ROLL_J', 'ROLL_O'].indexOf(Session.roleCode) !== -1) ||
            ((Session.teacherGroupIds || []).length > 0 && Session.roleCode === 'ROLL_O' && roles.indexOf(USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_AVALDUS) !== -1) ||
            (Session.roleCode !== 'ROLL_O' && roles.indexOf(USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_AVALDUS) !== -1);
          }
        }
      });
}]);