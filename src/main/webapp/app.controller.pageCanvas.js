(function () {
    'use strict';

    function main($rootScope, $scope, AnnotationListFactory, DocumentInfoFactory) {

        $rootScope.$watch('selectedFile', function () {
            if (typeof($rootScope.selectedFile) !== 'string' || !$rootScope.selectedFile.length) {
                return;
            }

            $rootScope.docInfo = DocumentInfoFactory.get({
                filename: $rootScope.selectedFile
            });
            $rootScope.annotationsList = AnnotationListFactory.query({
                filename: $rootScope.selectedFile
            });
        });

        $rootScope.$watch('selectedFile', function () {
            $rootScope.selectedDrawingTool = 'select';
            $rootScope.selectedAnnotationGuid = null;
        });
    }

    angular.module('GroupDocsAnnotationApp').controller('PageCanvasController', main);
})();

