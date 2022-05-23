'use strict';

angular.module('hitsaOis').controller('StudentAbsenceController',
  ['$route', '$scope', '$timeout', 'ArrayUtils', 'DataUtils', 'QueryUtils', 'dialogService', 'message', '$location',
    function ($route, $scope, $timeout, ArrayUtils, DataUtils, QueryUtils, dialogService, message, $location) {
    // same constant that is in journal.edit.js
    var LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

    QueryUtils.createQueryForm($scope, '/absences', {order: '-sa.inserted', status: 'isNotAccepted'});
    DataUtils.convertStringToDates($scope.criteria, ['validFrom', 'validThru']);
    $scope.auth = $route.current.locals.auth;
    if ($scope.auth.school.notAbsence) {
      message.error('main.messages.error.nopermission');
      return $location.path('');
    }
    $scope.statusChanged = statusChanged;

    statusChanged();

    var loadData = $scope.loadData;
    $scope.loadData = function() {
      $scope.absencesSearchForm.$setSubmitted();
      if(!$scope.absencesSearchForm.$valid) {
        message.error('main.messages.form-has-errors');
      } else {
        loadData();
      }
    };

    $scope.directiveControllers = [];
    var clearCriteria = $scope.clearCriteria;
    $scope.clearCriteria = function () {
      clearCriteria();
      $scope.directiveControllers.forEach(function (c) {
        c.clear();
      });
    };
    
    $scope.studyPeriods = QueryUtils.endpoint('/autocomplete/studyPeriods').query();
    $scope.studyYears = QueryUtils.endpoint('/autocomplete/studyYears').query();
    $scope.studyYears.$promise.then(function() {
      var currentStudyYear = DataUtils.getCurrentStudyYearOrPeriod($scope.studyYears);
      $scope.criteria.studyYear = !$scope.criteria.studyYear && currentStudyYear ? currentStudyYear.id : $scope.criteria.studyYear;

      if($scope.criteria.studyYear) {
        $timeout($scope.loadData);
      } else if($scope.studyYears.length === 0) {
        message.error('studyYear.missing');
      }
    });

    var AcceptEndpoint = QueryUtils.endpoint('/absences/accept');
    $scope.accept = function (absence) {
      dialogService.confirmDialog({
        prompt: 'absence.acceptConfirm'
      }, function () {
        new AcceptEndpoint(absence).$update().then(function () {
          ArrayUtils.remove($scope.tabledata.content, absence);
          message.info('absence.accepted');
          if (!$scope.criteria.status) {
            $scope.loadData();
          }
        });
      });
    };

    $scope.openRejectDialog = function (absence) {
      var form = 'studentAbsence/absence.reject.dialog.html';

      dialogService.showDialog(form,
        function (dialogScope) {
          dialogScope.absence = absence;
          function isFormValid() {
            dialogScope.dialogForm.$setSubmitted();
            if (!dialogScope.dialogForm.$valid) {
              message.error('main.messages.form-has-errors');
              return false;
            }
            return true;
          }
  
          dialogScope.rejectAbsence = function () {
            if (isFormValid()) {
              QueryUtils.endpoint('/absences/reject/' + dialogScope.absence.id).put(dialogScope.rejectReason).$promise.then(function () {
                ArrayUtils.remove($scope.tabledata.content, absence);
                message.info('absence.rejected');
                if (!$scope.criteria.status) {
                  $scope.loadData();
                }
              });
            }
          };
        }, function () {});
    };

    var AcceptByLessonsEndpoint = QueryUtils.endpoint('/absences/acceptByLessons');
    $scope.acceptByLessons = function (absence) {
      dialogService.showDialog('studentAbsence/absence.accept.by.lessons.dialog.html', function(dialogScope) {
        dialogScope.canEdit = true;
        dialogScope.absence = absence;
        dialogScope.maxLessonNr = 10;
        dialogScope.lessons = LESSONS.map(function (it) { return { nameEt: it, nameEn: it, id: it }; });
        dialogScope.lessonsByDate = {};
        dialogScope.lessonsToAccept = false;

        dialogScope.showWeekendsChanged = function () {
          dialogScope.dates = getPeriodDates(dialogScope.showWeekends);
          dialogScope.lessonsToAccept = getLessonsToAccept();
        };

        dialogScope.lessonByDate = function () {
          dialogScope.lessonsToAccept = getLessonsToAccept();
        };

        function getPeriodDates(showWeekends) {
          var dates = [];

          if (!dialogScope.absence.validThru) {
            addPeriodDate(dates, showWeekends, new Date(dialogScope.absence.validFrom));
          } else {
            var currentDate = moment.utc(dialogScope.absence.validFrom);
            var periodEndDate = moment.utc(dialogScope.absence.validThru);
            
            while (currentDate <= periodEndDate) {
              addPeriodDate(dates, showWeekends, currentDate.toDate());
              currentDate = moment(currentDate).add(1, 'days');
            }
          }
          return dates;
        }

        function addPeriodDate(dates, showWeekends, date) {
          if (showWeekends) {
            dates.push(date);
          } else {
            if (!DataUtils.isWeekend(date)) {
              dates.push(date);
            }
          }
        }

        dialogScope.dates = getPeriodDates(false);

        function getLessonsToAccept() {
          for (var date in dialogScope.lessonsByDate) {
            var lessonsToAccept = getDateLessonsToAccept(date);
            if (lessonsToAccept) {
              return true;
            }
          }
          return false;
        }

        function getDateLessonsToAccept(date) {
          if (!dialogScope.showWeekends && DataUtils.isWeekend(new Date(date))) {
            return false;
          }

          for (var lesson in dialogScope.lessonsByDate[date]) {
            if (dialogScope.lessonsByDate[date][lesson]) {
              return true;
            }
          }
          return false;
        }

      }, function (submittedDialogScope) {
        var lessonsByDate = {};
        angular.forEach(submittedDialogScope.lessonsByDate, function (lessons, date) {
          if (!submittedDialogScope.showWeekends && DataUtils.isWeekend(new Date(date))) {
            lessons = undefined;
          }
          lessonsByDate[moment(new Date(date)).format('YYYY-MM-DD')] = lessons;
        });

        absence.lessonsByDate = lessonsByDate;
        new AcceptByLessonsEndpoint(absence).$update().then(function () {
          ArrayUtils.remove($scope.tabledata.content, absence);
          message.info('absence.accepted');
          if (!$scope.criteria.status) {
            $scope.loadData();
          }
        });
      });
    };

    $scope.viewAcceptedLessons = function (absence) {
      dialogService.showDialog('studentAbsence/absence.accept.by.lessons.dialog.html', function(dialogScope) {
        dialogScope.canEdit = false;
        QueryUtils.endpoint('/absences').get({id: absence.id}).$promise.then(function (result) {
          dialogScope.absence = result;
          dialogScope.lessonsByDate = result.acceptedLessonsByDate;
          dialogScope.maxLessonNr = result.maxLessonNr > 10 ? result.maxLessonNr : 10;
          dialogScope.dates = Object.keys(result.acceptedLessonsByDate);
        });
        
      });
    };

    $scope.filterByStudyYear = function(studyYearId) {
      return function(studyPeriod) {
        return !studyYearId || studyPeriod.studyYear === studyYearId;
      };
    };

    $scope.studyYearChanged = function() {
      $scope.criteria.studyPeriod = undefined;
    };

    function statusChanged() {
      $scope.criteria.isAccepted = null;
      $scope.criteria.isRejected = null;

      switch ($scope.criteria.status) {
        case 'accepted':
          $scope.criteria.isAccepted = true;
          break;
        case 'rejected':
          $scope.criteria.isRejected = true;
          break;
        case 'isNotAccepted':
          $scope.criteria.isAccepted = false;
          $scope.criteria.isRejected = false;
          break;
      }
    }
  }]);
