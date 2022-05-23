'use strict';

angular.module('hitsaOis').controller('ApplicationStudentListController', function ($scope, $location, $route, $q, QueryUtils, Classifier) {
  $scope.auth = $route.current.locals.auth;
  var studentId = $route.current.locals.auth.student;
  var applicationsMapper = Classifier.valuemapper({type: 'AVALDUS_LIIK', status: 'AVALDUS_STAATUS'});
  QueryUtils.createQueryForm($scope, '/students/'+studentId+'/applications', {order: 'type.' + $scope.currentLanguageNameField()}, applicationsMapper.objectmapper);
  $q.all(applicationsMapper.promises).then($scope.loadData);

  $scope.applicationTypesApplicable = QueryUtils.endpoint('/applications/student/'+studentId+'/applicable').search();
  Classifier.queryForDropdown({ mainClassCode: 'AVALDUS_LIIK' }).$promise.then(function (responses) {
    if ($scope.auth.isGuestStudent()) {
      $scope.applicationTypes = responses.filter(function (classifier) {
        return classifier.code === 'AVALDUS_LIIK_MUU';
      });
    } else {
      $scope.applicationTypes = responses;
    }
  });
});
