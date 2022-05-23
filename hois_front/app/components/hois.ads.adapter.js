(function(){
  'use strict';
  
  /**
   * @ngdoc directive
   * @name hitsaOis.directive:hoisAdsAdapter
   * @description
   * # hoisAdsAdapter
   */
  angular.module('hitsaOis')
    .directive('hoisAdsAdapter', function (inAadressService, $document) {
      return {
        restrict: 'E',
        replace: true,
        scope: {
          value: "=ngModel",
          adsOid: "=adsOidModel",
          address: "=addressModel",
          ov: "=?ovModel",
          required:'@',
          ngRequired:'=',
        },
        link: function(scope, elements) {
          var element = elements[0];
          function updateAddress() {
            inAadressService.getInAds().setAddress(scope.address);
          }
          inAadressService.append(element);
          if (inAadressService.isLoaded()) {
            inAadressService.getInAds().hideResult();
          }
          scope.$watch('address', updateAddress);
          $document.on('inaadressLoaded', updateAddress);
          $document.on('addressSelected', function(event) {
            var info = event.detail[0];
            scope.$apply(function(scope) {
              scope.value = info.koodaadress;
              scope.adsOid = info.ads_oid;
              scope.address = info.aadress;
              scope.ov = info.ehakov;
            });
            inAadressService.getInAds().hideResult();
          });
        }
      };
    });
})();
