'use strict';

/**
 * @ngdoc service
 * @name hitsaOis.School
 * @description
 * # School
 * Service in the hitsaOis.
 */
angular.module('hitsaOis').factory('School', ['QueryUtils',
  function (QueryUtils) {

    function School() {
    }

    School.getAll = function () {
      return QueryUtils.endpoint('/autocomplete/schools').query();
    };

    School.getLdap = function () {
      return QueryUtils.endpoint('/autocomplete/ldapschools').query();
    };

    School.getSchoolsWithLogo = function () {
      return QueryUtils.endpoint('/autocomplete/schoolsWithLogo').query();
    };

    School.getSchoolsWithType = function () {
      return QueryUtils.endpoint('/autocomplete/schoolsWithType').query();
    };

    return School;
  }
]);
