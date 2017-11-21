(function () {
    'use strict';

    var ANNOTATION_TYPE_AREA = 1;

    angular.module('GroupDocsAnnotationApp')
        .factory('DocumentInfoFactory', DocumentInfoFactory)
        .factory('AnnotationListFactory', AnnotationListFactory)
        .factory('AnnotationAddFactory', AnnotationAddFactory)
        .controller('AvailableFilesController', AvailableFilesController)
        .controller('ToolbarController', ToolbarController)
    ;

    function DocumentInfoFactory($rootScope, $resource) {
        return $resource('/document/info?file=:filename', {}, {
            get: {
                method: 'GET'
            }
        });
    }

    function AnnotationListFactory($rootScope, $resource) {
        return $resource('/annotation/list?file=:filename', {}, {
            query: {
                method: 'GET',
                isArray: true
            }
        });
    }

    function AnnotationAddFactory($rootScope, $resource) {
        return $resource('/annotation/add?file=:filename', {}, {
            save: {
                method: 'POST'
            }
        });
    }

    function AvailableFilesController($scope, FilesFactory) {
        $scope.list = FilesFactory.query();
    }

    function ToolbarController($scope, $mdToast) {

        $scope.$on('annotation-added', function (event, args) {
            $mdToast.show(
                $mdToast.simple().textContent('Annotation added')
            );
        });

        $scope.$on('annotation-deleted', function (event, args) {
            $mdToast.show(
                $mdToast.simple().textContent('Annotation deleted')
            );
        });
    }

})();

