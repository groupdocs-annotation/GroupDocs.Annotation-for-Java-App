(function () {
    'use strict';

    function main($resource) {

        return $resource(
            '/files',
            {},
            {
                query: {
                    method: 'GET',
                    isArray: true
                }
            }
        );
    }

    angular.module('GroupDocsAnnotationApp').factory('FilesFactory', main);

})();

