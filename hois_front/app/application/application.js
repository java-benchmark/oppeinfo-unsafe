'use strict';


angular.module('hitsaOis').controller('ApplicationController', function ($http, $location, $q, $route, $scope, $timeout,
  ArrayUtils, AuthService, Classifier, Curriculum, DataUtils, FormUtils, QueryUtils, USER_ROLES, config, dialogService,
  message, oisFileService, $filter) {
  var ApplicationsEndpoint = QueryUtils.endpoint('/applications');

  $scope.removeFromArray = function(items, item) {
    ArrayUtils.remove(items, item);
    $scope.applicationForm.$setDirty();
  };
  $scope.auth = $route.current.locals.auth;
  $scope.isCreate = $route.current.locals.isCreate;
  $scope.isView = $route.current.locals.isView;
  $scope.now = new Date();
  $scope.formState = {};
  if ($scope.auth.isAdmin() && !AuthService.isAuthorized('ROLE_OIGUS_M_TEEMAOIGUS_TUGITEENUS')) {
    $scope.formState.excludedTypes = ["AVALDUS_LIIK_TUGI"];
  }

  function entityToForm(savedApplication) {
    DataUtils.convertStringToDates(savedApplication, ['startDate', 'endDate']);
    savedApplication.plannedSubjects.map(function(plannedSubject) {
      plannedSubject.subjectsSelected = plannedSubject.equivalents;
      return plannedSubject;
    });
    angular.extend($scope.application, savedApplication);
    $scope.formState.isNewSchool = false;
    $scope.application.newApelSchool = null;
    $scope.canChange = canChange($scope.application);
    $scope.canSave = canSave($scope.application);
  }

  $scope.applicationEditView = false;
  $scope.application = {files: [], status: 'AVALDUS_STAATUS_KOOST'};
  $scope.canChange = canChange($scope.application);
  $scope.canSave = canSave($scope.application);

  var entity = $route.current.locals.entity;
  if (angular.isDefined(entity)) {
    var allowedOnForm = true;
    entity.$promise.then(function (response) {
      if (!$scope.isView) {
        if (!canChange(response)) {
          allowedOnForm = false;
        }
      } else {
        allowedOnForm = (response.isConnectedByCommittee && ($scope.auth.isAdmin() || $scope.auth.isLeadingTeacher() || $scope.auth.isTeacher())) ||
        (response.isConnectedByStudentGroup && $scope.auth.isTeacher() && AuthService.isAuthorized('ROLE_OIGUS_V_TEEMAOIGUS_AVALDUS')) ||
        (!$scope.auth.isTeacher() && AuthService.isAuthorized('ROLE_OIGUS_V_TEEMAOIGUS_AVALDUS'));
        if ($scope.auth.isAdmin() && response.type === 'AVALDUS_LIIK_TUGI' &&
          !AuthService.isAuthorized('ROLE_OIGUS_V_TEEMAOIGUS_TUGITEENUS') && !response.isConnectedByCommittee) {
          allowedOnForm = false;
        }
      }
      if (!allowedOnForm) {
        message.error('main.messages.error.nopermission');
        $scope.back("#/");
      }
    });
  }

  $scope.showOnlyTypes = !angular.isDefined(entity) && $scope.auth.isTeacher() ? ['AVALDUS_LIIK_TUGI'] : true;

  if (angular.isDefined(entity)) {
    if (entity.hasBeenSeenByAdmin === true) { // Hack to remove OptimisticLock
      entity.version++;
    }
    entityToForm(entity);
  }

  if (angular.isDefined($route.current.params.student) && angular.isDefined($route.current.params.type)) {
    $scope.application.type = $route.current.params.type;
    QueryUtils.endpoint('/autocomplete/students?id=' + $route.current.params.student).get({}, function (result) {
      if (result && result.totalElements === 1) {
        $scope.application.student = result.content[0];
      }
    });
  }

  function canChange(application) {
    var createdApplicationPerm = false;
    var reviewApplicationPerm = false;
    var confirmedApplicationPerm = false;

    if (application.status === 'AVALDUS_STAATUS_KOOST') {
      createdApplicationPerm = ($scope.auth.isAdmin() && AuthService.isAuthorized(USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_AVALDUS)) ||
        ($scope.auth.isStudent() || (($scope.auth.isParent() || $scope.auth.isTeacher()) && application.type === 'AVALDUS_LIIK_TUGI'));
    } else if (application.status === 'AVALDUS_STAATUS_YLEVAAT') {
      reviewApplicationPerm = $scope.auth.isAdmin() && AuthService.isAuthorized(USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_AVALDUS);
    } else if (application.status === 'AVALDUS_STAATUS_KINNITATUD') {
      confirmedApplicationPerm = application.type === 'AVALDUS_LIIK_RAKKAVA' && application.canChangeThemeReplacements;
    }
    if (($scope.auth.isAdmin() && 
      application.type === 'AVALDUS_LIIK_TUGI' && !AuthService.isAuthorized('ROLE_OIGUS_M_TEEMAOIGUS_TUGITEENUS') && !application.isConnectedByCommittee)) {
      return false;
    }
    return application.canEditStudent && (createdApplicationPerm || reviewApplicationPerm || confirmedApplicationPerm);
  }

  function canSave(application) {
    var createdApplicationPerm = application.status === 'AVALDUS_STAATUS_KOOST';
    var reviewApplicationPerm = false;
    var confirmedApplicationPerm = false;

    if (application.status === 'AVALDUS_STAATUS_YLEVAAT') {
      reviewApplicationPerm = application.status === 'AVALDUS_STAATUS_YLEVAAT' && $scope.auth.isAdmin();
    } else if (application.status === 'AVALDUS_STAATUS_KINNITATUD') {
      confirmedApplicationPerm = application.type === 'AVALDUS_LIIK_RAKKAVA' && application.canChangeThemeReplacements;
    }

    return (!$scope.application.id || $scope.application.canEditStudent) &&
      (createdApplicationPerm || reviewApplicationPerm || confirmedApplicationPerm);
  }

  function studyPeriodDisplay(studyPeriod) {
    return $scope.currentLanguageNameField(studyPeriod.studyYear) + ' ' + $scope.currentLanguageNameField(studyPeriod);
  }

  $scope.studyPeriodView = function (studyPeriodId) {
    if (angular.isArray($scope.studyPeriods) && angular.isNumber(studyPeriodId)) {
      for (var i = 0; i < $scope.studyPeriods.length; i++) {
        if ($scope.studyPeriods[i].id === studyPeriodId) {
          return studyPeriodDisplay($scope.studyPeriods[i]);
        }
      }
    }
  };

  function applicationFinm(student, loadFormDeferred) {
    if ($scope.isCreate) {
      $scope.application.oldFin = student.fin;
      $scope.application.oldFinSpecific = student.finSpecific;
    }
    $scope.application.newFin = student.fin === "FINALLIKAS_RE" ? "FINALLIKAS_REV" : "FINALLIKAS_RE";
    loadFormDeferred.resolve();
  }

  function applicationOvorm(student, loadFormDeferred) {
    if ($scope.isCreate) {
      $scope.application.oldStudyForm = student.studyForm;
    }
    loadFormDeferred.resolve();
    $scope.oVersFilter = [$scope.application.oldStudyForm];
    // filter out study form external for non-external students
    if (student.type !== 'OPPUR_E') {
      $scope.oVersFilter.push('OPPEVORM_E');
    }
  }

  function applicationOkava(student, loadFormDeferred) {
    var allCurriculumVersions = Curriculum.queryVersions({ valid: true });
    if ($scope.isCreate) {
      $scope.application.oldStudyForm = student.studyForm;
      $scope.application.oldCurriculumVersion = student.curriculumVersion;
    }
    if (student.type === 'OPPUR_E') {
      $scope.application.newStudyForm = 'OPPEVORM_E';
      $scope.disableStudyFormChange = true;
    }

    var allStudyForms = Classifier.queryForDropdown({ mainClassCode: 'OPPEVORM' });
    function filterStudyForms() {
      var newCurriculumVersion = $scope.application.newCurriculumVersion;
      var selectedCurriculumVersion = newCurriculumVersion ? allCurriculumVersions.find(function (it) { return it.id === newCurriculumVersion.id; }) : undefined;
      var higher = angular.isObject(selectedCurriculumVersion) ? !selectedCurriculumVersion.isVocational : $scope.auth.school.higher;
      var vocational = angular.isObject(selectedCurriculumVersion) ? selectedCurriculumVersion.isVocational : $scope.auth.school.vocational;

      var studyForms;
      if(selectedCurriculumVersion && angular.isString(selectedCurriculumVersion.studyForm)) {
        studyForms = [selectedCurriculumVersion.studyForm];
      } else {
        studyForms = allStudyForms.filter(function(it) {
          return (higher && it.higher) || (vocational && it.vocational);
        }).map(function(it) { return it.code;});
      }
      // filter out study form external for non-external students
      if (student.type !== 'OPPUR_E') {
        studyForms = studyForms.filter(function (item) {
          return item !== 'OPPEVORM_E';
        });
      }
      $scope.allowedStudyForms = studyForms;
    }

    $scope.newCurriculumVersionSelected = function () {
      var selectedCurriculumVersion = allCurriculumVersions.find(function (it) { return it.id === $scope.application.newCurriculumVersion.id; });
      if (angular.isObject(selectedCurriculumVersion)) {
        allStudyForms.$promise.then(function() {
          if (!$scope.disableStudyFormChange) {
            $scope.application.newStudyForm = selectedCurriculumVersion.studyForm;
            filterStudyForms();
          }
        });
      }
    };

    allCurriculumVersions.$promise.then(function (result) {
      if (student.curriculumVersion !== null && student.curriculumVersion !== undefined) {
        $scope.curriculumVersions = result.filter(function (it) { return it.id !== student.curriculumVersion.id; });
      } else {
        $scope.curriculumVersions = result;
      }
      allStudyForms.$promise.then(function() {
        filterStudyForms();
        loadFormDeferred.resolve();
      });
    });
  }

  function applicationAkad(student, loadFormDeferred) {
    if ($scope.isCreate) {
      $scope.application.isPeriod = true;
    }
    $scope.studyPeriods = QueryUtils.endpoint('/autocomplete/studyPeriodsWithYear').query({},
    function (studyPeriods) {
      studyPeriods.forEach(function (studyPeriod) {
        studyPeriod.display = studyPeriodDisplay(studyPeriod);
      });
      loadFormDeferred.resolve();
    });
    $scope.curriculumVersion = student.curriculumVersion;
  }

  function applicationAkadk(loadFormDeferred) {
    DataUtils.convertStringToDates($scope.application.validAcademicLeave, ['startDate', 'endDate']);
    $scope.studyPeriods = QueryUtils.endpoint('/autocomplete/studyPeriods').query({}, loadFormDeferred.resolve);
  }

  function applicationValis(loadFormDeferred) {
    Classifier.queryForDropdown({mainClassCode: 'EHIS_KOOL'}, function(result) {
      $scope.ehisSchoolMap = Classifier.toMap(result);
    });

    $scope.addPlannedSubjectRow = function () {
      if (!angular.isArray($scope.application.plannedSubjects)) {
        $scope.application.plannedSubjects = [];
      }
      $scope.application.plannedSubjects.push({ equivalents: [] });
    };

    $scope.subjectsChanged = function (plannedSubject) {
      if (angular.isArray(plannedSubject.subjectsSelected)) {
        var newEquivalents = [];
        plannedSubject.subjectsSelected.forEach(function (selectedSubject) {
          var found = false;
          for (var i = 0; i < plannedSubject.equivalents.length && !found; i++) {
            var equivalent = plannedSubject.equivalents[i];
            if (equivalent.subject === selectedSubject.subject) {
              found = true;
              newEquivalents.push(equivalent);
            }
          }
          if (!found) {
            newEquivalents.push({subject: selectedSubject.subject});
          }
        });
        plannedSubject.equivalents = newEquivalents;
      } else {
        plannedSubject.equivalents = [];
      }
    };

    $scope.moduleOrThemeChanged = function(plannedSubject) {
      // deselect module themes
      deSelectModuleThemes(plannedSubject);
      // reenable module themes
      reEnableForSelection(plannedSubject);
      if (angular.isArray(plannedSubject.subjectsSelected)) {
        var newEquivalents = [];
        plannedSubject.subjectsSelected.forEach(function (moduleTheme) {
          // equivalent holds already saved selected subjects/themes/modules
          // new object is only added if it is not already saved
          var found = false;
          for (var i = 0; i < plannedSubject.equivalents.length && !found; i++) {
            var equivalent = plannedSubject.equivalents[i];
            if (equivalent.themeId === moduleTheme.themeId && equivalent.moduleId === moduleTheme.moduleId) {
              newEquivalents.push(equivalent);
              found = true;
            }
          }
          if (!found) {
            newEquivalents.push({ themeId: moduleTheme.themeId, moduleId: moduleTheme.moduleId });
          }
          // if module is chosen, disable its themes
          disableModuleThemes(moduleTheme);
        });
        plannedSubject.equivalents = newEquivalents;
      } else {
        plannedSubject.equivalents = [];
      }
    };

    function disableModuleThemes(moduleTheme) {
      if (moduleTheme.isModule) {
        var moduleThemes = $scope.modulesAndThemes.filter(function(moduleOrTheme) {
          return !moduleOrTheme.isModule && moduleOrTheme.moduleId === moduleTheme.moduleId;
        });
        for (var themeIndex = 0; themeIndex < moduleThemes.length; themeIndex++) {
          moduleThemes[themeIndex].disabled = true;
        }
      }
    }

    function deSelectModuleThemes(plannedSubject) {
      // find all modules
      var selectedModules = plannedSubject.subjectsSelected.filter(function(selectedModule) {
        return selectedModule.moduleId !== undefined && (selectedModule.themeId === undefined || selectedModule.themeId === null);
      });
      // deselect module themes
      selectedModules.forEach(function(selectedModule) {
        var themesToBeDeselected = plannedSubject.subjectsSelected.filter(function(theme) {
          return theme.moduleId === selectedModule.moduleId && theme.themeId !== selectedModule.themeId;
        });
        themesToBeDeselected.forEach(function(theme) {
          ArrayUtils.remove(plannedSubject.subjectsSelected, theme);
        });
      });
    }

    function reEnableForSelection(plannedSubject) {
      for (var i = 0; i < $scope.modulesAndThemes.length; i++) {
        var plannedModule = $scope.modulesAndThemes[i];
        if (plannedModule.isModule) {
          // check if this module is chosen
          var chosenList = plannedSubject.subjectsSelected.filter(function(selectedModule) {
            return selectedModule.moduleId === plannedModule.moduleId && selectedModule.themeId === plannedModule.themeId;
          });
          // if it is not chosen, make its themes enabled
          if (chosenList === undefined || chosenList.length === 0) {
            var moduleThemes = $scope.modulesAndThemes.filter(function(theme) {
              return theme.isModule === false && theme.moduleId === plannedModule.moduleId;
            });
            for (var themeIndex = 0; themeIndex < moduleThemes.length; themeIndex++) {
              moduleThemes[themeIndex].disabled = false;
            }
          }
        }
      }
    }

    $scope.studentEhisSchool = $scope.auth.school.ehisSchool;
    if ($scope.isCreate) {
      $scope.application.isPeriod = true;
    }
    $scope.student = QueryUtils.endpoint('/students/' + $scope.application.student.id).get();
    $scope.studyPeriods = QueryUtils.endpoint('/autocomplete/studyPeriodsWithYear').query({}, function (response) {
      response.forEach(function (studyPeriod) {
        studyPeriod.display = $scope.currentLanguageNameField(studyPeriod.studyYear) + ' ' + $scope.currentLanguageNameField(studyPeriod);
      });
    });
    $q.resolve($scope.student.$promise, function() {loadForm(loadFormDeferred);});
  }

  function sortByName(array) {
    return $filter('orderBy')(array, $scope.currentLanguageNameField());
  }

  function loadForm(loadFormDeferred) {
    if ($scope.student.curriculumVersion.isVocational) {
      $scope.modulesAndThemesQuery = QueryUtils.endpoint('/autocomplete/curriculumversionomodulesandthemes').query({
        student: $scope.application.student.id,
        curriculumVersion: $scope.student.curriculumVersion.id
      });
    } else {
      $scope.studentSubjects = QueryUtils.endpoint('/autocomplete/subjectsList').query();
    }
    $scope.apelSchools = QueryUtils.endpoint('/autocomplete/apelschools').query();
    $q.all([$scope.student.curriculumVersion.isVocational ? $scope.modulesAndThemesQuery.$promise : $scope.studentSubjects.$promise,
      $scope.studyPeriods.$promise, $scope.apelSchools.$promise])
    .then(function () {resolve(loadFormDeferred);});
  }

  $scope.addNewSchool = function () {
    $scope.formState.isNewSchool = true;
    emptyNewSchoolForm();
  };

  $scope.cancelCreatingNewSchool = function () {
    $scope.formState.isNewSchool = false;
    emptyNewSchoolForm();
  };

  function emptyNewSchoolForm() {
    $scope.newSchoolEst = false;
    $scope.application.newApelSchool = null;
  }

  $scope.newSchoolCountryChanged = function (countryCode) {
    $scope.newSchoolEst = countryCode === 'RIIK_EST' ? true : false;
    $scope.application.newApelSchool.ehisSchool = null;
  };

  $scope.ehisSchoolChanged = function (ehisCode) {
    var ehisSchool = $scope.ehisSchoolMap[ehisCode];
    $scope.application.newApelSchool.nameEt = ehisSchool.nameEt;
    $scope.application.newApelSchool.nameEn = ehisSchool.nameEn;
  };

  function resolve(loadFormDeferred) {
    if ($scope.student.curriculumVersion.isVocational) {
      $scope.modulesAndThemes = getModulesAndThemes($scope.modulesAndThemesQuery);
    } else {
      $scope.studentSubjects = $scope.studentSubjects.map(function (autocompleteSubject) {
        return {subject: autocompleteSubject.id, nameEt: autocompleteSubject.nameEt, nameEn: autocompleteSubject.nameEn};
      });
    }
    loadFormDeferred.resolve();
  }

  function getModulesAndThemes(result) {
    var modulesAndThemes = [];
    if (result) {
      result = sortByName(result);

      for (var i = 0; i < result.length; i++) {
        modulesAndThemes.push({
          moduleId: result[i].id,
          themeId: null,
          nameEt: result[i].nameEt,
          nameEn: result[i].nameEn,
          isModule: true
        });
        var themes = sortByName(result[i].themes);
        if (themes) {
          for (var j = 0; j < themes.length; j++) {
            modulesAndThemes.push({
              moduleId: result[i].id,
              themeId: themes[j].id,
              nameEt: result[i].nameEt + "/" + themes[j].nameEt,
              nameEn: result[i].nameEn + "/" + themes[j].nameEn,
              isModule: false,
            });
          }
        }
      }
      return modulesAndThemes;
    }
  }

  function applicationOverskava(student, loadFormDeferred) {
    if (!$scope.application.id) {
      $scope.application.oldCurriculumVersion = student.curriculumVersion;
    }
    $scope.formState = {
      curriculum: student.curriculum,
      curriculumVersions: QueryUtils.endpoint("/autocomplete/curriculumversions").query({
        valid: true,
        higher: true,
        curriculumId: student.curriculum
      }, function(result) {
        $scope.formState.curriculumVersions = result.filter(function (r) {
          return r.id !== $scope.application.oldCurriculumVersion.id;
        });
        if ($scope.formState.curriculumVersions.length === 0) {
          $scope.formState.curriculumsEmpty = true;
        }
      }),
      studentGroups: QueryUtils.endpoint("/autocomplete/studentgroups").query({valid: true, higher: true, curriculumId: student.curriculum, studyForm: student.studyForm})
    };
    $q.all($scope.formState.curriculumVersions, $scope.formState.studentGroups).then(loadFormDeferred.resolve);
  }

  function applicationRakkava(student, loadFormDeferred) {
    if (!$scope.application.id) {
      $scope.application.oldCurriculumVersion = student.curriculumVersion;
    }
    $scope.formState = {
      curriculum: student.curriculum,
      curriculumVersions: QueryUtils.endpoint("/autocomplete/curriculumversions").query({
        valid: true,
        higher: false,
        curriculumId: student.curriculum,
        hasGroup: true,
        studyForm: (student.type !== 'OPPUR_E' ? student.studyForm : undefined)
      }, function(result) {
        $scope.formState.curriculumVersions = result.filter(function (r) {
          return r.id !== $scope.application.oldCurriculumVersion.id;
        });
        if ($scope.formState.curriculumVersions.length === 0) {
          $scope.formState.curriculumsEmpty = true;
        }
      }),
      studentGroups: QueryUtils.endpoint("/autocomplete/studentgroups").query({valid: true, higher: false, curriculumId: student.curriculum, studyForm: (student.type !== 'OPPUR_E' ? student.studyForm : undefined)})
    };
    $q.all($scope.formState.curriculumVersions, $scope.formState.studentGroups).then(loadFormDeferred.resolve);

    if ($scope.isView) {
      getThemeReplacementData();
    }

    $scope.newCurriculumVersionSelected = function () {
      getThemeReplacementData();
    };

    function getThemeReplacementData() {
      QueryUtils.endpoint("/applications/curriculumVersionThemeReplacements/:id").search({
        id: $scope.application.student.id,
        applicationId: $scope.application.id,
        curriculumVersionId: $scope.application.newCurriculumVersion.id
      }).$promise.then(function (result) {
        $scope.application.themeReplacement = result;
    });
    }

  }

  function applicationEksmat(loadFormDeferred) {
    loadFormDeferred.resolve();
  }

  function applicationMuu(loadFormDeferred) {
    loadFormDeferred.resolve();
  }

  function applicationTugi(loadFormDeferred) {
    $scope.application.selectedModules = []; // Should be declared before because of possible error with table where used multiselect.
    $scope.onTugiClChange = function () {
      if ($scope.formState.supportService) {
        var exists = $scope.application.supportServices.find(function (r) {
          return r.code === $scope.formState.supportService.code;
        }) === undefined;
        if (exists) {
          $scope.application.supportServices.push($scope.formState.supportService);
        }
        $scope.formState.supportService = undefined;
      }
    };

    $scope.deleteService = function (service) {
      for(var i = 0; i < $scope.application.supportServices.length; i++){
        if ($scope.application.supportServices[i].code === service.code) {
          $scope.application.supportServices.splice(i, 1);
        }
      }
    };

    $scope.tugiIndivCurriculum = ($scope.application.supportServices || []).find(function (cl) {
      return cl.code === 'TUGITEENUS_1';
    }) !== undefined;
    if (!$scope.isView && $scope.auth.isAdmin()) {
      $scope.$watchCollection('application.supportServices', function (newValues, oldValues) {
        if (newValues !== oldValues) {
          $scope.tugiIndivCurriculum = (newValues || []).find(function (cl) {
            return cl.code === 'TUGITEENUS_1';
          }) !== undefined;
        }
      });

      $scope.formState = {
        committees: QueryUtils.endpoint("/autocomplete/committeesList").query({type: 'KOMISJON_A', valid: true}, function(results) {
          if ($scope.application.id && $scope.application.committee) {
            for (var i = 0; i < results.length; i++) {
              if (results[i].id === $scope.application.committee.id) {
                angular.extend(results[i], $scope.application.committee);
                return;
              }
            }
            results.push($scope.application.committee);
          }
        }),
        modules: QueryUtils.endpoint('/applications/studentIndividualCurriculumModules/:id').query({id: $scope.application.student.id}).$promise.then(function (result) {
          $scope.curriculumVersionModules = result;

          if ($scope.application.supportModules) {
            $scope.application.supportModules.forEach(function (individualModule) {

              var curriculumModule = ($scope.curriculumVersionModules || []).find(function (cvModule) {
                return cvModule.module.id === individualModule.module.id;
              });
              if (curriculumModule) {
                $scope.application.selectedModules.push(curriculumModule);
                curriculumModule.id = individualModule.id;
                curriculumModule.addInfo = individualModule.addInfo;
              }
            });
          }
        }),
        supportServices: Classifier.queryForDropdown({
          mainClassCode: 'TUGITEENUS',
          higher: $scope.auth.school.higher ? true : undefined,
          vocational: $scope.auth.school.vocational ? true : undefined})
      };
      $q.all($scope.formState.committees, $scope.formState.modules, $scope.formState.supportServices).then(loadFormDeferred.resolve);
    } else {
      loadFormDeferred.resolve();
    }
  }

  function loadFormData(type, studentId) {
    var loadFormDeferred = $q.defer();
    if (['AVALDUS_LIIK_AKAD', 'AVALDUS_LIIK_FINM', 'AVALDUS_LIIK_OVORM', 'AVALDUS_LIIK_OKAVA', 'AVALDUS_LIIK_OVERSKAVA', 'AVALDUS_LIIK_RAKKAVA'].indexOf(type) !== -1) {
      QueryUtils.endpoint('/students').get({ id: studentId }, function (student) {
        switch (type) {
          case 'AVALDUS_LIIK_AKAD':
            applicationAkad(student, loadFormDeferred);
            break;
          case 'AVALDUS_LIIK_FINM':
            applicationFinm(student, loadFormDeferred);
            break;
          case 'AVALDUS_LIIK_OVORM':
            applicationOvorm(student, loadFormDeferred);
            break;
          case 'AVALDUS_LIIK_OKAVA':
            applicationOkava(student, loadFormDeferred);
            break;
          case 'AVALDUS_LIIK_OVERSKAVA':
            applicationOverskava(student, loadFormDeferred);
            break;
          case 'AVALDUS_LIIK_RAKKAVA':
            applicationRakkava(student, loadFormDeferred);
            break;
        }
      });
    } else if (type === 'AVALDUS_LIIK_AKADK') {
      if ($scope.isCreate) {
        QueryUtils.endpoint('/applications/student/' + studentId + '/validAcademicLeave').search(function (validAcademicLeave) {
          if (!angular.isObject(validAcademicLeave) || !angular.isNumber(validAcademicLeave.id)) {
            loadFormDeferred.reject('application.messages.academicLeaveApplicationNotfound');
          } else {
            $scope.application.validAcademicLeave = validAcademicLeave;
            applicationAkadk(loadFormDeferred);
          }
        });
      } else {
        applicationAkadk(loadFormDeferred);
      }
    } else if (type === 'AVALDUS_LIIK_VALIS') {
      applicationValis(loadFormDeferred);
    } else if (type === 'AVALDUS_LIIK_EKSMAT') {
      applicationEksmat(loadFormDeferred);
    } else if (type === 'AVALDUS_LIIK_MUU') {
      applicationMuu(loadFormDeferred);
    } else if (type === 'AVALDUS_LIIK_TUGI') {
      applicationTugi(loadFormDeferred);
    }

    loadFormDeferred.promise.then(function () {
      $scope.applicationEditView = true;
      var type = $scope.application.type.substring($scope.application.type.lastIndexOf('_') + 1).toLowerCase();
      $scope.templateUrlByType = 'application/templates/application.type.' + type + "." + ($scope.isView ? 'view' : 'edit') + ".html";
      $timeout(setPristineWhenFinished);
    }, function (rejectMessage) {
      message.error(rejectMessage);
      $scope.applicationEditView = false;
    });
  }

  function setPristineWhenFinished() {
    if ($http.pendingRequests.length > 0) {
      $timeout(setPristineWhenFinished);
    } else {
      if ($scope.applicationForm) {
        $scope.applicationForm.$setPristine();
      }
    }
  }

  $scope.applicationTypeChange = function () {
    $scope.application.student = undefined;
    switch ($scope.application.type) {
      case 'AVALDUS_LIIK_AKAD':
        $scope.studentSearchCriteria = { active: true, nominalStudy: true };
        break;
      case 'AVALDUS_LIIK_AKADK':
        $scope.studentSearchCriteria = { active: true, academicLeave: true };
        break;
      case 'AVALDUS_LIIK_VALIS':
        $scope.studentSearchCriteria = { studying: true };
        break;
      case 'AVALDUS_LIIK_OKAVA':
        $scope.studentSearchCriteria = { studying: true, hasCurriculumVersion: true };
        break;
      case 'AVALDUS_LIIK_OVORM':
      case 'AVALDUS_LIIK_MUU':
        $scope.studentSearchCriteria = { studying: true, showGuestStudent: true };
        break;
      case 'AVALDUS_LIIK_OVERSKAVA':
        $scope.studentSearchCriteria = { studying: true, higher: true };
        break;
      case 'AVALDUS_LIIK_RAKKAVA':
      case 'AVALDUS_LIIK_TUGI':
        $scope.studentSearchCriteria = {studying: true, higher: false };
        break;
      default:
        $scope.studentSearchCriteria = { studying: true };
        break;
    }
    if ($scope.application.type !== 'AVALDUS_LIIK_MUU') {
      angular.extend($scope.studentSearchCriteria, {hideGuestStudents: true});
    }
    if ($scope.auth.isTeacher()) {
      angular.extend($scope.studentSearchCriteria, {studentGroup: $scope.auth.teacherGroupIds});
    }
  };

  $scope.$watch('application.student', function (student) {
    if (angular.isObject(student)) {
      if ($scope.isCreate) {
        QueryUtils.endpoint('/applications/student/' + student.id + '/applicable').search(function (result) {
          if (angular.isObject(result[$scope.application.type]) && result[$scope.application.type].isAllowed === true) {
            loadFormData($scope.application.type, student.id);
          } else {
            message.error(result[$scope.application.type].reason);
          }
        }, function () {
          $scope.back("#/");
        });
      } else {
        loadFormData($scope.application.type, student.id);
      }
    }
  });

  $scope.openAddFileDialog = function () {
    dialogService.showDialog('application/file.add.dialog.html', function (dialogScope) {
      dialogScope.addedFiles = $scope.application.files;
    }, function (submittedDialogScope) {
      var data = submittedDialogScope.data;
      oisFileService.getFromLfFile(data.file[0], function (file) {
        data.oisFile = file;
        $scope.application.files.push(data);
      });
    });
  };

  $scope.onOisFileChange = function () {
    if ($scope.applicationForm.fileData && $scope.applicationForm.fileData.$modelValue && $scope.applicationForm.fileData.$modelValue[0]) {
      oisFileService.getFromLfFile($scope.applicationForm.fileData.$modelValue[0], function (file) {
        $scope.application.oisFile = file;
      });
    } else {
      $scope.application.oisFile = undefined;
    }
  };

  $scope.getUrl = oisFileService.getUrl;

  $scope.isStudentRepresentative = function () {
    return angular.isObject($scope.auth) && angular.isObject($scope.application.student) &&
      $scope.auth.student === $scope.application.student.id && $scope.auth.isParent();
  };

  function submit() {
    if (!validateForm()) {
      return;
    }
    QueryUtils.endpoint('/applications/' + $scope.application.id + '/submit/').put().$promise.then(function (response) {
      message.info('application.messages.submitted');
      if ($scope.auth.isAdmin() || $scope.isView) {
        entityToForm(response);
        $scope.applicationForm.$setPristine();
      } else {
        $location.url('/applications/' + $scope.application.id + '/view?_noback');
      }
    }).catch(angular.noop);
  }

  $scope.updateSubject = function() {
    FormUtils.withValidForm($scope.applicationForm, function () {
      if (angular.isDefined($scope.applicationForm) && $scope.applicationForm.$dirty === true ) {
        dialogService.confirmDialog({prompt: 'application.messages.confirmSave'}, function() {
          changeApplicationSubjects();
        });
      }
    });
  };

  function changeApplicationSubjects() {
    QueryUtils.endpoint('/applications/' + $scope.application.id + '/subjects').put({plannedSubjects: $scope.application.plannedSubjects}).$promise.then(function (response) {
      message.info('application.messages.saved');
      if ($scope.isView) {
        entityToForm(response);
        $scope.applicationForm.$setPristine();
      } else {
        $location.url('/applications/' + $scope.application.id + '/view?_noback');
      }
    }).catch(angular.noop);
  }

  $scope.submit = function () {
    $scope.strictRequired = false;
    $timeout(function () {
      FormUtils.withValidForm($scope.applicationForm, function () {
        if (!validateForm()) {
          return;
        }
        if (angular.isDefined($scope.applicationForm) && $scope.applicationForm.$dirty === true ) {
          dialogService.confirmDialog({prompt: 'application.messages.confirmSaveAndSubmit'}, function() {
            beforeSave();
            var application = new ApplicationsEndpoint($scope.application);
            application.$update().then(function (response) {
              entityToForm(response);
              submit();
            }).catch(angular.noop);
          });
        } else {
          dialogService.confirmDialog({prompt: 'application.messages.confirmSubmit'}, function() {
            submit();
          });
        }
      });
    });
  };

  $scope.getStar = function(additionalCheck) {
    return $scope.strictRequired || (angular.isDefined(additionalCheck) && !additionalCheck) ? '' : ' *';
  };

  function notifyAboutSpecialNeeds(confirmCallback) {
    if ($scope.application.type === 'AVALDUS_LIIK_TUGI' && !$scope.application.hasSpecialNeed) {
      dialogService.confirmDialog({prompt: 'application.messages.studentHasNoSpecialNeedConfirm'}, function() {
        confirmCallback();
      });
    } else {
      confirmCallback();
    }
  }

  function confirm() {
    QueryUtils.endpoint('/applications/' + $scope.application.id + '/confirm/').put().$promise.then(function (response) {
      message.info('application.messages.confirmed');
      if ($scope.isView) {
        entityToForm(response);
        $scope.applicationForm.$setPristine();
      } else {
        $location.url('/applications/' + $scope.application.id + '/view?_noback');
      }
    }).catch(angular.noop);
  }

  $scope.confirm = function () {
    $scope.strictRequired = true;
    $timeout(function () {
      FormUtils.withValidForm($scope.applicationForm, function () {
        notifyAboutSpecialNeeds(function () {
          if (angular.isDefined($scope.applicationForm) && $scope.applicationForm.$dirty === true ) {
            dialogService.confirmDialog({prompt: 'application.messages.confirmSaveAndConfirm'}, function() {
              beforeSave();
              var application = new ApplicationsEndpoint($scope.application);
              application.$update().then(function (response) {
                $scope.strictRequired = false;
                entityToForm(response);
                confirm();
              }).catch(angular.noop);
            });
          } else {
            dialogService.confirmDialog({prompt: 'application.messages.confirmConfirm'}, function() {
              confirm();
            });
          }
        });
      });
    });
  };

  $scope.confirmConfirmation = function () {
    FormUtils.withValidForm($scope.applicationForm, function () {
      QueryUtils.endpoint('/applications/' + $scope.application.id + '/confirmConfirmation').put({
        confirm: $scope.application.agreeWithDecision,
        oisFile: $scope.application.oisFile,
        representativeDecisionAddInfo: $scope.application.representativeDecisionAddInfo
      }).$promise.then(function (response) {
        message.info('application.messages.confirmed');
        if ($scope.isView) {
          entityToForm(response);
          $scope.applicationForm.$setPristine();
        } else {
          $location.url('/applications/' + $scope.application.id + '/view?_noback');
        }
      }).catch(angular.noop);
    });
  };

  $scope.removeConfirmation = function () {
    dialogService.confirmDialog({prompt: $scope.application.representativeConfirmed ?
      'application.messages.confirmRemovingFinalConfirmation' : 'application.messages.confirmRemovingConfirmation'}, function() {
      QueryUtils.endpoint('/applications/' + $scope.application.id + '/removeConfirmation').put().$promise.then(function (response) {
        message.info('application.messages.removeConfirmationSuccess');
        if ($scope.isView) {
          entityToForm(response);
          $scope.applicationForm.$setPristine();
        } else {
          $location.url('/applications/' + $scope.application.id + '/view?_noback');
        }
      }).catch(angular.noop);
    });
  };

  $scope.pdfUrl = function () {
    return config.apiUrl + "/applications/print/" + $scope.application.id + "/application.pdf";
  };

  $scope.reject = function () {
    $scope.strictRequired = false;
    $timeout(function () {
      dialogService.showDialog('application/reject.dialog.html', null, function (submittedDialogScope) {
        QueryUtils.endpoint('/applications/' + $scope.application.id + '/reject/').put({ reason: submittedDialogScope.rejectReason }).$promise.then(function (response) {
          message.info('application.messages.rejected');
          if ($scope.isView) {
            entityToForm(response);
            $scope.applicationForm.$setPristine();
          } else {
            $location.url('/applications/' + $scope.application.id + '/view?_noback');
          }
        }).catch(angular.noop);
      });
    });
  };

  $scope.save = function () {
    $scope.strictRequired = false;
    $timeout(function () {
      FormUtils.withValidForm($scope.applicationForm, function () {
        beforeSave();
        if (!validateForm()) {
          return;
        }
        var application = new ApplicationsEndpoint($scope.application);
        if (angular.isDefined($scope.application.id)) {
          application.$update().then(function () {
            message.info('main.messages.update.success');
            entityToForm(application);
            $scope.applicationForm.$setPristine();
          }).catch(angular.noop);
        } else {
          application.$save().then(function () {
            message.info('main.messages.create.success');
            $location.url('/applications/' + application.id + '/edit?_noback');
          }).catch(angular.noop);
        }
      });
    });
  };

  function validateForm() {
    if ($scope.application.type === 'AVALDUS_LIIK_VALIS') {
      if ($scope.application.apelSchool !== undefined && $scope.application.apelSchool.country === 'RIIK_EST' && $scope.application.apelSchool.ehisSchool === null) {
        if ($scope.auth.isAdmin()) {
          message.error('application.messages.apelSchoolMissingAdmin');
        } else {
          message.error('application.messages.apelSchoolMissing');
        }
        return false;
      }
    }
    return true;
  }

  function beforeSave() {
    if ($scope.application.type === 'AVALDUS_LIIK_RAKKAVA') {
      var applicationOmoduleThemes = [];

      $scope.application.themeReplacement.modules.forEach(function (omodule) {
        omodule.newThemes.forEach(function (theme) {
          if (theme.covering) {
            applicationOmoduleThemes.push(theme);
          }
        });
        omodule.oldThemes.forEach(function (theme) {
          applicationOmoduleThemes.push(theme);
        });
      });
      $scope.application.themeReplacements = applicationOmoduleThemes;
    }
  }

  $scope.delete = function () {
    dialogService.confirmDialog({ prompt: 'application.deleteconfirm' }, function () {
      var application = new ApplicationsEndpoint($scope.application);
      application.$delete().then(function () {
        message.info('main.messages.delete.success');
        if ($scope.auth.isStudent()) {
          $scope.back('#/applications/student');
        } else {
          $scope.back('#/applications');
        }
      }).catch(angular.noop);
    });
  };

  $scope.periodTypeChanged = function() {
    $scope.application.startDate = undefined;
    $scope.application.endDate = undefined;
    $scope.application.studyPeriodStart = undefined;
    $scope.application.studyPeriodEnd = undefined;
  };

  $scope.isValid = function () {
    return function (cl) {
      return Classifier.isValid(cl);
    };
  };
});
