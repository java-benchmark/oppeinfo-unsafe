'use strict';

/**
 * @ngdoc service
 * @name hitsaOis.Curriculum
 * @description
 * # Curriculum
 * Factory in the hitsaOis.
 */
angular.module('hitsaOis')
  .factory('Curriculum', function ($resource, config, QueryUtils, $rootScope) {

    var SHORT_MAX_VALUE = 32767;
    
    function Curriculum() {
    }

    Curriculum.STATUS = {
        ENTERING: 'OPPEKAVA_STAATUS_S',     //Sisestamisel
        PROCEEDING: 'OPPEKAVA_STAATUS_M',   //Menetlemisel
        VERIFIED: 'OPPEKAVA_STAATUS_K',     //Kinnitatud
        CLOSED: 'OPPEKAVA_STAATUS_C'        //Suletud
    };

    Curriculum.VERSION_STATUS = {
        S: 'OPPEKAVA_VERSIOON_STAATUS_S',   //Sisestamisel
        K: 'OPPEKAVA_VERSIOON_STAATUS_K',   //Kinnitatud
        C: 'OPPEKAVA_VERSIOON_STAATUS_C'    //Suletud
    };

    Curriculum.query = function(params, successCallback) {
      var resource = $resource(config.apiUrl+'/curriculum');
      var queryParams = QueryUtils.getQueryParams(params);
      return resource.get(queryParams, successCallback);
    };

    Curriculum.getAreasOfStudyByGroupOfStudy = function(code, successCallback) {
        var resource = $resource(config.apiUrl+'/curriculum/areasOfStudyByGroupOfStudy/' + code);
        return resource.query(successCallback);
    };

    Curriculum.modulesViewData = function(modules) {
        var occupationModuleTypesModules = {};
        var modulesWithOutOccupation = {};
        modules.forEach(function(curriculumModule) {
            if (angular.isArray(curriculumModule.occupations) && curriculumModule.occupations.length > 0) {
              curriculumModule.occupations.forEach(function(occupation) {

                if(!angular.isObject(occupationModuleTypesModules[occupation.code])){
                  occupationModuleTypesModules[occupation.code] = {occupation: occupation, moduleTypes: {}};
                }
                if(!angular.isObject(occupationModuleTypesModules[occupation.code].moduleTypes[curriculumModule.module.code])){
                  occupationModuleTypesModules[occupation.code].moduleTypes[curriculumModule.module.code] = {moduleType: curriculumModule.module, modules: []};
                }
                occupationModuleTypesModules[occupation.code].moduleTypes[curriculumModule.module.code].modules
                  .push(curriculumModule);
              });
          } else {
            //modules without occupation
            if (!angular.isObject(modulesWithOutOccupation[curriculumModule.module.code])) {
              modulesWithOutOccupation[curriculumModule.module.code] = {moduleType: curriculumModule.module, modules: []};
            }
            modulesWithOutOccupation[curriculumModule.module.code].modules.push(curriculumModule);
          }
        });

        return { occupationModuleTypesModules: occupationModuleTypesModules, modulesWithOutOccupation: modulesWithOutOccupation};
    };

    Curriculum.queryVersions = function(params) {
      return QueryUtils.endpoint('/autocomplete/curriculumversions').query(params);
    };

    function orderCurriculumModuleByOrderNr(cModule) {
      return cModule.orderNr === undefined || cModule.orderNr === null ? SHORT_MAX_VALUE : cModule.orderNr; // undefined and null place at the end
    }

    /**
     * OrderBy for modules
     * 
     * @param defaultOrder - Function or Array[Function] or String. Can be undefined
     */
    Curriculum.curriculumModuleOrder = function (defaultOrder) {
      if (angular.isFunction(defaultOrder) || (angular.isArray(defaultOrder) && angular.isFunction(defaultOrder[0]))) {
        return [orderCurriculumModuleByOrderNr].concat(defaultOrder);
      } else if (!!defaultOrder) {
        return [orderCurriculumModuleByOrderNr, function (module) {
          return module[defaultOrder];
        }];
      }
      return [orderCurriculumModuleByOrderNr, $rootScope.currentLanguageNameField];
    };

    var higherModuleTypeOrder = Object.freeze({
      KORGMOODUL_V: 1,   // Unschooling
      KORGMOODUL_F: 2,   // Final exam
      KORGMOODUL_L: 3    // Final thesis
    });

    Curriculum.higherModuleTypeOrder = function (type) {
      return higherModuleTypeOrder[type] === undefined ? 0 : higherModuleTypeOrder[type];
    };

    return Curriculum;
  });
