'use strict';

angular.module('hitsaOis').controller('StudentGroupSearchController', ['$route', '$scope', '$q', 'Classifier', 'Curriculum', 'Session', 'QueryUtils',
  function ($route, $scope, $q, Classifier, Curriculum, Session, QueryUtils) {
    var baseUrl = '/studentgroups';
    var clMapper = Classifier.valuemapper({studyForm: 'OPPEVORM'});
    $scope.auth = $route.current.locals.auth;
    QueryUtils.createQueryForm($scope, baseUrl, {order: 'code'}, clMapper.objectmapper);

    var school = Session.school || {};
    var onlyhigher = school.higher && !school.vocational;
    $scope.formState = {allCurriculumVersions: Curriculum.queryVersions({userId: $scope.auth.isLeadingTeacher() ? $scope.auth.user : null}), curriculumVersions: [],
                        allStudyForms: Classifier.queryForDropdown({mainClassCode: 'OPPEVORM', higher: school.higher || undefined, vocational: school.vocational || undefined}),
                        studyForms: [], curriculumVersionLabel: 'studentGroup.curriculumVersionBoth', onlyhigher: onlyhigher};

    if ($scope.criteria.isValid === undefined) {
      $scope.criteria.isValid = true;
    }

    if(onlyhigher) {
      $scope.formState.curriculumVersionLabel = 'studentGroup.curriculumVersionHigher';
    } else if(!school.higher && school.vocational) {
      $scope.formState.curriculumVersionLabel = 'studentGroup.curriculumVersionVocational';
    }

    $scope.$watch('criteria.curriculum', function() {
      var curriculumId = $scope.criteria.curriculum ? $scope.criteria.curriculum.id : null;
      // store current selected value
      $scope.formState.studyForm = $scope.criteria.studyForm || [];

      function afterCurriculumChange(result) {
        if(curriculumId) {
          $scope.formState.curriculumVersions = $scope.formState.allCurriculumVersions.filter(function(cv) { return cv.curriculum === curriculumId;});
          if ($scope.criteria.curriculumVersion && $scope.criteria.curriculumVersion.length > 0) {
            $scope.criteria.curriculumVersion.forEach(function (selectedCv) {
              var existsInGroup = $scope.formState.curriculumVersions.find(function (cv) {
                return selectedCv === cv.id;
              });
              if (!existsInGroup) {
                $scope.criteria.curriculumVersion.splice($scope.criteria.curriculumVersion.indexOf(selectedCv), 1);
              }
            });
          }
        } else {
          // all versions allowed
          $scope.formState.curriculumVersions = $scope.formState.allCurriculumVersions;
        }
        $scope.formState.studyForms = result.studyForms || [];
        // try to restore selected value(s)
        $scope.criteria.studyForm = $scope.formState.studyForm.filter(function(it) { return $scope.formState.studyForms.indexOf(it) !== -1; });

        $scope.curriculumVersionChanged();
      }

      if(curriculumId) {
        QueryUtils.endpoint(baseUrl+'/curriculumdata').get({id: curriculumId}, afterCurriculumChange);
      } else {
        // curriculum cleared
        afterCurriculumChange({studyForms: $scope.formState.allStudyForms.map(function(it) { return it.code;} )});
      }
    });

    function hiddenStudyForms() {
      return $scope.formState.studyForms.length > 0 ? $scope.formState.allStudyForms.filter(function(it) { return $scope.formState.studyForms.indexOf(it.code) === -1; }) : undefined;
    }

    $scope.curriculumVersionChanged = function() {
      if(!$scope.criteria.curriculumVersion || $scope.criteria.curriculumVersion.length === 0) {
        $scope.formState.hiddenStudyForms = hiddenStudyForms();
      } else {
        var sf = $scope.formState.curriculumVersions.reduce(function(acc, item) { acc[item.id] = item.studyForm; return acc; }, {});
        sf = $scope.criteria.curriculumVersion.map(function(it) { return sf[it];});
        if(sf.indexOf(null) !== -1) {
          // curriculum version without study form, let user select from all values (optionally filtered by curriculum)
          $scope.formState.hiddenStudyForms = hiddenStudyForms();
        } else {
          // allow selection of study forms specified by curriculum versions
          $scope.formState.hiddenStudyForms = $scope.formState.allStudyForms.filter(function(it) { return sf.indexOf(it.code) === -1; });
        }
      }
    };

    $q.all(clMapper.promises).then($scope.loadData);
  }
]).controller('StudentGroupEditController', ['$location', '$mdDialog', '$q', '$route', '$scope', 'dialogService', 'message', 'Classifier', 'Curriculum', 'QueryUtils', 'Session',
  function ($location, $mdDialog, $q, $route, $scope, dialogService, message, Classifier, Curriculum, QueryUtils, Session) {
    $scope.auth = $route.current.locals.auth;
    var id = $route.current.params.id;
    var baseUrl = '/studentgroups';
    var Endpoint = QueryUtils.endpoint(baseUrl);
    var clMapper = Classifier.valuemapper({studyForm: 'OPPEVORM', studyLevel: 'OPPEASTE', status: 'OPPURSTAATUS'});
    var clSpecMapper = Classifier.valuemapper({code: 'SPETSKUTSE'});

    var school = Session.school || {};
    var onlyvocational = !school.higher && school.vocational;
    $scope.formState = {allCurriculumVersions: Curriculum.queryVersions({userId: $scope.auth.isLeadingTeacher() ? $scope.auth.user : null}), curriculumVersions: [],
                        languages: [], studyForms: [], specialities: [], selectedStudents: [], order: 'rowno',
                        curriculumVersionLabel: 'studentGroup.curriculumVersionBoth',
                        onlyvocational: onlyvocational, isVocational: school.vocational};

    if(onlyvocational) {
      $scope.formState.curriculumVersionLabel = 'studentGroup.curriculumVersionVocational';
    } else if(school.higher && !school.vocational) {
      $scope.formState.curriculumVersionLabel = 'studentGroup.curriculumVersionHigher';
    }

    $scope.curriculumChanged = function() {
      var curriculumId = $scope.record.curriculum ? $scope.record.curriculum.id : null;
      if($scope.formState.curriculumId === curriculumId) {
        return;
      }
      $scope.formState.curriculumId = curriculumId;
      // store current values
      $scope.formState.language = $scope.record.language;
      $scope.formState.studyForm = $scope.record.studyForm;
      $scope.formState.speciality = $scope.record.speciality;
      $scope.formState.curriculumVersion = $scope.record.curriculumVersion;

      var afterCurriculumChange = function(result) {
        $scope.formState.curriculumVersions = $scope.formState.allCurriculumVersions.filter(function(cv) { return cv.curriculum === curriculumId;});
        $scope.formState.languages = result.languages || [];
        $scope.formState.studyForms = result.studyForms || [];
        $scope.formState.origStudyLevel = result.origStudyLevel;
        $scope.formState.specialities = result.specialities || [];
        $scope.formState.isVocational = result.isVocational;
        $scope.formState.studyPeriodInYears = result.studyPeriodInYears;

        $q.all(clSpecMapper.promises).then(function () {
          clSpecMapper.objectmapper($scope.formState.specialities);
          $scope.formState.specialities.forEach(function (r) {
            r.code.validFrom = r.validFrom;
            r.code.validThru = r.validThru;
          });
          $scope.record.speciality = $scope.formState.specialities.find(function(it) { return it.code.code === $scope.formState.speciality; }) !== undefined ? $scope.formState.speciality : null;
        });
        if (!$scope.record.isGuest) {
          // try to restore values
          $scope.record.language = $scope.formState.languages.indexOf($scope.formState.language) !== -1 ? $scope.formState.language : null;
          $scope.record.studyForm = $scope.formState.studyForms.indexOf($scope.formState.studyForm) !== -1 ? $scope.formState.studyForm : null;
          $scope.record.curriculumVersion = $scope.formState.curriculumVersions.find(function(it) {return it.id === $scope.formState.curriculumVersion;}) !== undefined ? $scope.formState.curriculumVersion : null;
        }
      };
      if(curriculumId) {
        QueryUtils.endpoint(baseUrl+'/curriculumdata').get({id: curriculumId}, afterCurriculumChange);
      } else {
        // curriculum cleared
        afterCurriculumChange({});
      }
    };

    /** Used by isGuest checkbox */
    $scope.clearModels = function () {
      if ($scope.record.isGuest) {
        // clear unneeded values
        $scope.record.places = undefined;
        $scope.record.curriculum = undefined;
        $scope.record.curriculumVersion = undefined;
        $scope.record.studyForm = undefined;
      }
    };

    $scope.curriculumVersionChanged = function() {
      if($scope.record.curriculumVersion) {
        var sf = $scope.formState.curriculumVersions.reduce(function(acc, item) { acc[item.id] = item.studyForm; return acc; }, {});
        var v = sf[$scope.record.curriculumVersion];
        if(v) {
          $scope.record.studyForm = v;
        }
      }
    };

    $scope.$watch('record.validThru', function (newValue) {
      if (newValue && typeof newValue === 'string') {
        $scope.record.validThru = new Date(newValue);
      }
    });

    $scope.$watch('record.validFrom', function (newValue) {
      if (newValue && typeof newValue === 'string') {
        $scope.record.validFrom = new Date(newValue);
      }
    });

    $scope.validThruChanged = function() {
      var thru = $scope.record.validThru;
      if(thru) {
        if(typeof $scope.record.validThru === 'string') {
          thru = moment(thru, "YYYY-MM-DD'T'hh:mm:ss.SSS'Z'");
        }
      }
      $scope.formState.canAddStudents = !thru || moment().isSameOrBefore(thru, 'day');
    };

    function afterLoad() {
      $scope.formState.students = clMapper.objectmapper($scope.record.members);
      $scope.formState.selectedStudents = angular.copy($scope.formState.students);
      $scope.formState.readonly = $scope.record.id && $scope.formState.students && $scope.formState.students.length > 0;
      $scope.formState.currentCurriculumVersion = $scope.record.curriculumVersion;
      $scope.curriculumChanged();
      $scope.validThruChanged();
      $scope.record.members.forEach(function(it, i) { it.rowno = i + 1; });
    }

    if(id) {
      $scope.record = Endpoint.get({id: id}, afterLoad);
    } else {
      // new student group
      $scope.record = new Endpoint();
      $scope.formState.readonly = false;
    }

    $scope.update = function() {
      $scope.studentGroupForm.$setSubmitted();
      if (!$scope.studentGroupForm.$valid) {
        message.error('main.messages.form-has-errors');
        return;
      }

      if ($scope.record.id && $scope.formState.currentCurriculumVersion !== $scope.record.curriculumVersion) {
        QueryUtils.endpoint(baseUrl + '/existsPendingLessonPlans/' + $scope.record.id)
          .search({formCurriculumVersion: $scope.record.curriculumVersion}).$promise.then(function (result) {
            if (result.pendingLessonPlans) {
              dialogService.confirmDialog({prompt: 'studentGroup.updateLessonPlansConfirm', studentGroup: $scope.record.code}, function() {
                updateStudentGroup();
              });
            } else {
              updateStudentGroup();
            }
          });
      } else {
        updateStudentGroup();
      }
    };

    function updateStudentGroup() {
      $scope.record.students = $scope.formState.selectedStudents.map(function(item) { return item.id; });
      if ($scope.record.id) {
        $scope.record.$update().then(afterLoad).then(message.updateSuccess).catch(angular.noop);
      } else {
        $scope.record.$save().then(function() {
          message.info('main.messages.create.success');
          $location.url(baseUrl + '/' + $scope.record.id + '/edit?_noback');
        }).catch(angular.noop);
      }
    }

    $scope.delete = function() {
      dialogService.confirmDialog({prompt: 'studentGroup.deleteconfirm'}, function() {
        $scope.record.$delete().then(function() {
          message.info('main.messages.delete.success');
          $location.url(baseUrl + '?_noback');
        }).catch(angular.noop);
      });
    };

    function storeStudents(selectedStudents) {
      $scope.formState.selectedStudents = $scope.formState.selectedStudents.concat(selectedStudents);
      $scope.update();
    }

    $scope.addStudents = function() {
      $scope.studentGroupForm.$setSubmitted();
      if (!$scope.studentGroupForm.$valid) {
        message.error('main.messages.form-has-errors');
        return;
      }
      var query = ['id', 'curriculum', 'curriculumVersion', 'language','studyForm', 'isGuest'].reduce(function(q, name) {
        q[name] = $scope.record[name];
        return q;
      }, {});
      var findstudents = function(scope) {
        QueryUtils.endpoint(baseUrl+'/findstudents').query(query, function(result) {
          if(result.length === 0) {
            scope.formState.students = undefined;
            message.info('studentGroup.nostudentsfound');
            return;
          }
          $q.all(clMapper.promises).then(function() {
            var students = clMapper.objectmapper(result);
            if (angular.isNumber($scope.formState.curriculumVersion)) {
              students = students.filter(function(student) {return student.curriculumVersion.id === $scope.formState.curriculumVersion;});
            }
            students.forEach(function(it, i) { it.rowno = i + 1; });
            scope.formState.students = students;
          });
        });
      };

      if($scope.record.id) {
        var labelId = $scope.formState.curriculumVersionLabel;
        $mdDialog.show({
          controller: function($scope) {
            $scope.formState = {selectedStudents: [], curriculumVersionLabel: labelId, order: 'rowno'};

            $scope.cancel = $mdDialog.hide;
            $scope.select = function() {
              storeStudents($scope.formState.selectedStudents);
              $mdDialog.hide();
            };

            findstudents($scope);
          },
          templateUrl: 'studentGroup/student.select.dialog.html',
          clickOutsideToClose: false
        });
        return;
      }
      $scope.studentGroupForm.$setSubmitted();
      if(!$scope.studentGroupForm.$valid) {
        message.info('studentGroup.mandatoryfields');
        return;
      }
      findstudents($scope);
    };

    $scope.removeStudent = function(id) {
      dialogService.confirmDialog({prompt: 'studentGroup.deletestudentconfirm'}, function() {
        function filter(i) {
          return i.id !== id;
        }
        $scope.formState.students = $scope.formState.students.filter(filter);
        $scope.formState.selectedStudents = $scope.formState.selectedStudents.filter(filter);
      });
    };
  }
]).controller('StudentGroupViewController', ['$route', '$scope', '$q', 'Classifier', 'Curriculum', 'QueryUtils', 'Session', 'USER_ROLES', 'AuthService',
  function ($route, $scope, $q, Classifier, Curriculum, QueryUtils, Session, USER_ROLES, AuthService) {
    $scope.auth = $route.current.locals.auth;
    $scope.canEdit = AuthService.isAuthorized(USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_OPPERYHM);
    $scope.showPersonalData = $scope.auth.isAdmin() || $scope.auth.isLeadingTeacher() || $scope.auth.isTeacher();
    var id = $route.current.params.id;
    var baseUrl = '/studentgroups';

    var clMapper = Classifier.valuemapper({status: 'OPPURSTAATUS'});
    var clMapperSpec = Classifier.valuemapper({speciality: 'SPETSKUTSE'});

    var school = Session.school || {};
    var onlyvocational = !school.higher && school.vocational;
    $scope.formState = {curriculumVersionLabel: 'studentGroup.curriculumVersionBoth',
                        onlyvocational: onlyvocational, isVocational: school.vocational, order: 'rowno'};

    if(onlyvocational) {
      $scope.formState.curriculumVersionLabel = 'studentGroup.curriculumVersionVocational';
    } else if(school.higher && !school.vocational) {
      $scope.formState.curriculumVersionLabel = 'studentGroup.curriculumVersionHigher';
    }

    $scope.record = QueryUtils.endpoint(baseUrl).get({id: id}, function(result) {
      if(result && result.curriculum && result.curriculum.id) {
        QueryUtils.endpoint(baseUrl+'/curriculumdata').get({id: result.curriculum.id}, function(result) {
          $scope.formState.origStudyLevel = result.origStudyLevel;
          $scope.formState.isVocational = result.isVocational;
          var spec = result.specialities.find(function (r) {
            return r.code === (angular.isObject($scope.record.speciality) ? $scope.record.speciality.code : $scope.record.speciality);
          });
          $q.all(clMapperSpec.promises).then(function () {
            clMapperSpec.objectmapper($scope.record);
            if (spec) {
              $scope.record.speciality.validFrom = spec.validFrom;
              $scope.record.speciality.validThru = spec.validThru;
            }
          });
        });
      }
      if(result.curriculumVersion) {
        Curriculum.queryVersions().$promise.then(function(versions) {
          var current = versions.filter(function(it) { return it.id === result.curriculumVersion; });
          $scope.formState.curriculumVersion = current.length > 0 ? current[0] : undefined;
        });
      }
      $q.all(clMapper.promises).then(clMapper.objectmapper(result.members));
      result.members.forEach(function(it, i) { it.rowno = i + 1; });
    });
  }
]);
