'use strict';

angular.module('hitsaOis').config(['$routeProvider', 'USER_ROLES', function ($routeProvider, USER_ROLES) {
  $routeProvider
    .when('/poll', {
      templateUrl: 'poll/poll.list.html',
      controller: 'PollListController',
      resolve: {
        translationLoaded: function($translate) { return $translate.onReady(); } ,
        auth: function (AuthResolver) { return AuthResolver.resolve(); }
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/answers', {
      templateUrl: 'poll/poll.answers.html',
      controller: 'PollAnswersController',
      resolve: {
        translationLoaded: function($translate) { return $translate.onReady(); } ,
        auth: function (AuthResolver) { return AuthResolver.resolve(); }
      }
    })
    .when('/poll/answers/subjects', {
      templateUrl: 'poll/poll.answers.subjects.html',
      controller: 'PollSubjectsController',
      resolve: {
        translationLoaded: function($translate) { return $translate.onReady(); } ,
        auth: function (AuthResolver) { return AuthResolver.resolve(); }
      }
    })
    .when('/poll/statistics', {
      templateUrl: 'poll/poll.statistics.html',
      controller: 'PollStatisticsController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/new', {
      templateUrl: 'poll/poll.edit.html',
      controller: 'PollEditController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/new/:copiedId', {
      templateUrl: 'poll/poll.edit.html',
      controller: 'PollEditController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/:id/edit', {
      templateUrl: 'poll/poll.edit.html',
      controller: 'PollEditController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/questions', {
      templateUrl: 'poll/poll.questions.list.html',
      controller: 'PollQuestionsListController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/question/:id/view', {
      templateUrl: 'poll/poll.question.view.html',
      controller: 'PollQuestionEditController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/question/:id/edit', {
      templateUrl: 'poll/poll.question.edit.html',
      controller: 'PollQuestionEditController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/questions/:id/edit', {
      templateUrl: 'poll/poll.questions.edit.html',
      controller: 'PollQuestionsController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/questions/:id/view', {
      templateUrl: 'poll/poll.questions.view.html',
      controller: 'PollQuestionsController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/results/:id/view', {
      templateUrl: 'poll/poll.results.view.html',
      controller: 'PollResultsController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/results/:id/edit', {
      templateUrl: 'poll/poll.results.edit.html',
      controller: 'PollResultsController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_M_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/:id/view', {
      templateUrl: 'poll/poll.view.html',
      controller: 'PollEditController',
      resolve: { translationLoaded: function($translate) { return $translate.onReady(); },
        auth: function (AuthResolver) { return AuthResolver.resolve(); } 
      },
      data: {
        authorizedRoles: [USER_ROLES.ROLE_OIGUS_V_TEEMAOIGUS_KYSITLUS]
      }
    })
    .when('/poll/supervisor/:uuid', {
      templateUrl: 'poll/poll.response.html',
      controller: 'PollSupervisorController',
      resolve: {
        translationLoaded: function($translate) { return $translate.onReady(); },
      }
    })
    .when('/poll/expert/:uuid', {
      templateUrl: 'poll/poll.response.html',
      controller: 'PollExpertController',
      resolve: {
        translationLoaded: function($translate) { return $translate.onReady(); },
      }
    });
}]);
