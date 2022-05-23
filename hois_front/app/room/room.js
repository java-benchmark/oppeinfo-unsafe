'use strict';

angular.module('hitsaOis').controller('RoomSearchController', ['$scope', 'Classifier', 'QueryUtils',
  function ($scope, Classifier, QueryUtils) {
    $scope.equipmentDefs = Classifier.queryForDropdown({mainClassCode: 'SEADMED'});

    QueryUtils.createQueryForm($scope, '/rooms', {order: 'b.name'}, function(rows) {
      // set up equipment column
      rows.forEach(function(room) {
        room.equipment = (room.roomEquipment || []).map(function(e) { return {equipment: $scope.equipmentDefs[e.equipment], equipmentCount: e.equipmentCount}; });
      });
    });

    $scope.equipmentDefs.$promise.then(function() {
      $scope.equipmentDefs = Classifier.toMap($scope.equipmentDefs);
      $scope.loadData();
    });
  }
]).controller('RoomEditController', ['message', '$location', '$route', '$scope', 'Classifier', 'FormUtils', 'QueryUtils',
  function (message, $location, $route, $scope, Classifier, FormUtils, QueryUtils) {
    var id = $route.current.params.id;
    var baseUrl = '/rooms';
    var Endpoint = QueryUtils.endpoint(baseUrl);

    $scope.equipmentDefs = Classifier.queryForDropdown({mainClassCode: 'SEADMED'});
    $scope.formState = {roomUniqueQuery: {id: id}};

    function updateUniqueCommand() {
      $scope.formState.roomUniqueQuery.url = baseUrl + '/unique/' + ($scope.record.building || '0');
    }

    function afterLoad(record) {
      $scope.formState.roomEquipment = (record.roomEquipment || []).map(function(e) { return {equipment: $scope.equipmentDefs[e.equipment], equipmentCount: e.equipmentCount}; });
      updateUniqueCommand();
    }

    $scope.equipmentDefs.$promise.then(function() {
      $scope.equipmentDefs = Classifier.toMap($scope.equipmentDefs);
      if(id) {
        $scope.record = Endpoint.get({id: id}, afterLoad);
      } else {
        // new room
        $scope.record = new Endpoint({roomEquipment: [], isStudy: true});
        afterLoad($scope.record);
      }
    });

    $scope.addEquipment = function() {
      if($scope.formState.roomEquipment.some(function(e) { return e.equipment.code === $scope.formState.newEquipment.code; })) {
        message.error('room.duplicateequipment');
        return;
      }
      $scope.formState.roomEquipment.push({equipment: $scope.formState.newEquipment, equipmentCount: 1});
      $scope.formState.newEquipment = null;
    };

    $scope.deleteEquipment = function(code) {
      var rows = $scope.formState.roomEquipment;
      for(var row_no = 0, row_cnt = rows.length;row_no < row_cnt;row_no++) {
        if(rows[row_no].equipment.code === code) {
          rows.splice(row_no, 1);
          break;
        }
      }
    };

    $scope.update = function() {
      FormUtils.withValidForm($scope.roomForm, function() {
        $scope.record.roomEquipment = $scope.formState.roomEquipment.map(function(e) {
          return {equipment: e.equipment.code, equipmentCount: e.equipmentCount};
        });

        if($scope.record.id) {
          $scope.record.$update().then(afterLoad).then(message.updateSuccess).catch(angular.noop);
          $scope.roomForm.$setPristine();
        } else {
          $scope.record.$save().then(function() {
            message.info('main.messages.create.success');
            $location.url(baseUrl + '/' + $scope.record.id + '/edit?_noback');
          }).catch(angular.noop);
        }
      });
    };

    $scope.delete = function() {
      FormUtils.deleteRecord($scope.record, '/rooms/search?_noback', {prompt: 'room.deleteconfirm'});
    };

    $scope.buildingChanged = function() {
      updateUniqueCommand();
      $scope.roomForm.code.$validate();
    };
  }
]);
