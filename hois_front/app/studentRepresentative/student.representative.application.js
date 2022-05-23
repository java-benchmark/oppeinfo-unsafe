'use strict';

angular.module('hitsaOis').controller('StudentRepresentativeApplicationSearchController', ['$mdDialog', '$q', '$scope', 'dialogService', 'message', 'Classifier', 'QueryUtils',
  function ($mdDialog, $q, $scope, dialogService, message, Classifier, QueryUtils) {

    $scope.formState = {status: 'AVALDUS_ESINDAJA_STAATUS_E'};
    var clMapper = Classifier.valuemapper({relation: 'OPPURESINDAJA', status: 'AVALDUS_ESINDAJA_STAATUS'});
    QueryUtils.createQueryForm($scope, '/studentrepresentatives/applications', {order: 'student.person.lastname,student.person.firstname', status: $scope.formState.status}, clMapper.objectmapper);

    var refreshApplications = $scope.loadData;
    $scope.loadData = function() {
      refreshApplications();
      $scope.formState.status = $scope.criteria.status;
    };

    var acceptEndpoint = QueryUtils.endpoint('/studentrepresentatives/applications/accept');
    $scope.accept = function(row) {
      dialogService.confirmDialog({prompt: 'student.representative.application.confirm', student: row.studentFullname, representative: row.fullname}, function() {
        acceptEndpoint.update({id: row.id, version: row.version}).$promise.then(function() {
          message.info('student.representative.application.accepted');
          refreshApplications();
        }).catch(angular.noop);
      });
    };

    $scope.decline = function(row) {
      $mdDialog.show({
        controller: function($scope) {
          $scope.record = {id: row.id, version: row.version};
          $scope.decline = function() {
            $scope.studentRepresentativeApplicationDeclineForm.$setSubmitted();
            if(!$scope.studentRepresentativeApplicationDeclineForm.$valid) {
              message.error('main.messages.form-has-errors');
              return;
            }

            var data = $scope.record;
            QueryUtils.endpoint('/studentrepresentatives/applications/decline').update(data).$promise.then(function() {
              $mdDialog.hide();
              message.info('student.representative.application.declined');
              refreshApplications();
            }).catch(angular.noop);
          };
          $scope.cancel = $mdDialog.hide;
        },
        templateUrl: 'studentRepresentative/representative.application.decline.dialog.html',
        clickOutsideToClose: false
      });
    };

    $q.all(clMapper.promises).then($scope.loadData);
  }
]).controller('StudentRepresentativeApplicationCreateController', ['$location', '$scope', 'message', 'QueryUtils',
  function ($location, $scope, message, QueryUtils) {
    $scope.record = {};

    $scope.lookupPerson = function(response) {
      $scope.record.firstname = response.firstname;
      $scope.record.lastname = response.lastname;
    };

    $scope.lookupFailure = function(response) {
      if(!response || response.status !== 412) {
        message.error('student.representative.studentnotfound');
      }
      $scope.record.firstname = undefined;
      $scope.record.lastname = undefined;
    };

    $scope.apply = function() {
      $scope.studentRepresentativeApplicationCreateForm.$setSubmitted();
      if(!$scope.studentRepresentativeApplicationCreateForm.$valid) {
        message.error('main.messages.form-has-errors');
        return;
      }

      QueryUtils.endpoint('/studentrepresentatives/applications').save($scope.record).$promise.then(function() {
        message.info('student.representative.application.applied');
        $location.url('/?_noback');
      }).catch(angular.noop);
    };
  }
]);
