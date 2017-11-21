(function () {
    'use strict';

    function main($rootScope) {
        $rootScope.selectedFile = '';
    }

    angular.module('GroupDocsAnnotationApp').run(main);

})();

