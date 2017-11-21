(function () {
    'use strict';

    var ANNOTATION_TYPE_AREA = 1;

    angular.module('GroupDocsAnnotationApp')
        .factory('FilesFactory', FilesFactory)
        .factory('DocumentInfoFactory', DocumentInfoFactory)
        .factory('AnnotationListFactory', AnnotationListFactory)
        .factory('AnnotationAddFactory', AnnotationAddFactory)
        .controller('AvailableFilesController', AvailableFilesController)
        .controller('ToolbarController', ToolbarController)
    ;

    function FilesFactory() {
        var fileList = [
            'candy.pdf'
        ];
        return {
            list: function () {
                return fileList;
            }
        };
    }

    function DocumentInfoFactory($rootScope, $resource) {
        return $resource('/document/info?file=:filename', {}, {
            get: {
                method: 'GET',
                params: {
                    filename: $rootScope.selectedFile
                }
            }
        });
    }

    function AnnotationListFactory($rootScope, $resource) {
        return $resource('/annotation/list?file=:filename', {}, {
            query: {
                method: 'GET',
                params: {
                    filename: $rootScope.selectedFile
                },
                isArray: true
            }
        });
    }

    function AnnotationAddFactory($rootScope, $resource) {
        return $resource('/annotation/add?file=:filename', {}, {
            save: {
                method: 'POST',
                params: {
                    filename: $rootScope.selectedFile
                }
            }
        });
    }

    function AvailableFilesController($scope, FilesFactory) {
        $scope.list = FilesFactory.list();
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

