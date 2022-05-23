'use strict';

angular.module('hitsaOis').controller('JournalStudentSelectionController', function ($scope, $route, QueryUtils, ArrayUtils, message, dialogService) {
  $scope.auth = $route.current.locals.auth;
  var entity = $route.current.locals.entity;

  $scope.selectedStudents = [];
  $scope.addSelectedStudents = function() {
    if ($scope.selectedStudents.length > 0) {
      QueryUtils.endpoint('/journals/' + entity.id + '/addStudentsToJournal').save({students: $scope.selectedStudents}, $route.reload);
    } else {
      message.error('journal.messages.noStudentsSelected');
    }
  };

  QueryUtils.endpoint('/journals/' + entity.id + '/suitedStudents').query({}, function(result) {
    $scope.tabledata = {
      content: result
    };
    result.forEach(function(it) {
      $scope.selectedStudents.push(it.studentId);
    });
  });

  $scope.searchStudent = function() {
    dialogService.showDialog('journal/journal.searchStudent.dialog.html', function(dialogScope) {
      dialogScope.auth = $scope.auth;
      dialogScope.selectedStudents = [];
      dialogScope.searchedStudents = [];

      // code below required for not querying for students already present on the form,
      // thus avoiding double adding of the same student to the journal
      var students = [];
      if($scope.tabledata.content) {
        students = $scope.tabledata.content.map(function(s){
          return s.studentId;
        });
      }
      $route.current.params._menu = true;

      dialogScope.$watch('criteria.studentGroupObject', function() {
        dialogScope.criteria.studentGroupId = dialogScope.criteria.studentGroupObject ? dialogScope.criteria.studentGroupObject.id : null;
      });

      function retainSearchedStudents() {
        for (var i = 0; i < dialogScope.tabledata.content.length; i++) {
          var exists = false;
          for (var j = 0; j < dialogScope.searchedStudents.length; j++) {
            if (dialogScope.tabledata.content[i].studentId === dialogScope.searchedStudents[j].studentId) {
              exists = true;
              break;
            }
          }

          if (!exists) {
            dialogScope.searchedStudents.push(dialogScope.tabledata.content[i]);
          }
        }
      }

      QueryUtils.createQueryForm(dialogScope, '/journals/' + entity.id + '/otherStudents', {
        studentId: students
      }, retainSearchedStudents);

      dialogScope.loadData();
    }, function(submittedDialogScope) {
      submittedDialogScope.selectedStudents.forEach(function(it) {
        var student = submittedDialogScope.searchedStudents.filter(function (searchedStudent) {
          return it === searchedStudent.studentId;
        })[0];
        $scope.tabledata.content.push(student);
        $scope.selectedStudents.push(student.studentId);
      });
    });
  };

  $scope.removeStudent = function(row) {
    ArrayUtils.remove($scope.selectedStudents, row.studentId);
    ArrayUtils.remove($scope.tabledata.content, row);
  };
});
