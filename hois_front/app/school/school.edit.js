'use strict';

angular.module('hitsaOis').controller('SchoolEditController', ['$scope', '$route', 'School', '$location', 'dialogService', 'message', 'QueryUtils', 'oisFileService', 'Classifier', 'classifierAutocomplete',

  function ($scope, $route, School, $location, dialogService, message, QueryUtils, oisFileService, Classifier, classifierAutocomplete) {
    var id = $route.current.params.id;

    Classifier.queryForDropdown({mainClassCode: 'FOTOLISA'}, function (result) {
      $scope.clPhoto = (result || []).reduce(function (obj, r) {
        obj[r.code] = r;
        return obj;
      }, {});
    });

    function afterLoad() {
      if($scope.school.logo) {
        $scope.school.imageUrl = oisFileService.getUrl($scope.school.logo, 'school');
      } else {
        $scope.school.imageUrl = '?' + new Date().getTime();
      }
      if($scope.school.ehisSchool) {
        Classifier.get($scope.school.ehisSchool).$promise.then(function(result) {
          $scope.school._ehisSchool = result;
        });
      }
      if ($scope.schoolForm) {
        $scope.schoolForm.$setPristine();
      }
    }

    var baseUrl = '/school';
    var Endpoint = QueryUtils.endpoint(baseUrl);
    if(id) {
      $scope.school = Endpoint.get({id: id});
      $scope.school.$promise.then(afterLoad);
    }else{
      $scope.school = new Endpoint({studentPhotoAdd: 'FOTOLISA_EI', timetable: 'TIMETABLE_EI', isStudentDeclarationDelete: true});
      afterLoad();
    }

    function withLogo(afterLogoLoad) {
      if($scope.logoFiles[0]) {
        $scope.school.deleteCurrentLogo = null;
        $scope.school.logo = oisFileService.getFromLfFile($scope.logoFiles[0], afterLogoLoad);
      } else if($scope.school.deleteCurrentLogo) {
        $scope.school.logo = null;
        afterLogoLoad();
      } else {
        afterLogoLoad();
      }
    }

    $scope.update = function() {
      $scope.schoolForm.$setSubmitted();
      if(!$scope.schoolForm.$valid) {
        message.error("main.messages.form-has-errors");
        return;
      }
      if(!$scope.school.ehisSchool) {
        message.error("school.error.ehisSchoolMissing");
        return;
      }

      var msg = $scope.school.id ? 'main.messages.update.success' : 'main.messages.create.success';
      function afterSave() {
        message.info(msg);
        $scope.logoFileApi.removeAll();
        afterLoad();
      }

      withLogo(function() {
        if($scope.school.id) {
          $scope.school.$update().then(afterSave);
        } else {
          $scope.school.$save().then(afterSave);
        }
      });
    };

    $scope.delete = function() {
      dialogService.confirmDialog({prompt: 'school.deleteconfirm'}, function() {
        $scope.school.$delete().then(function() {
          $location.url(baseUrl);
        });
      });
    };

    // ehis school autocomplete
    $scope.querySearch = function(queryText) {
      return classifierAutocomplete.searchByName(queryText, 'EHIS_KOOL');
    };

    $scope.$watch('school.isNotAbsence', function () {
      if ($scope.school.isNotAbsence) {
        $scope.school.isMinorStudentAbsence = false;
      }
    });

    $scope.setEhisSchool = function() {
      var ehisSchool = $scope.school._ehisSchool || {};
      $scope.school.ehisSchool = ehisSchool.code;
      $scope.school.nameEt = ehisSchool.nameEt;
      $scope.school.ehisId = ehisSchool.value;
      $scope.school.regNr = ehisSchool.value2;
    };
  }
]);
