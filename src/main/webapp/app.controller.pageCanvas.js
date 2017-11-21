(function () {
    'use strict';

    function main($rootScope, $scope, AnnotationListFactory, DocumentInfoFactory) {

        $rootScope.$watch('selectedFile', function () {
            $rootScope.docInfo = DocumentInfoFactory.get({
                filename: $rootScope.selectedFile
            });
            $rootScope.annotationsList = AnnotationListFactory.query({
                filename: $rootScope.selectedFile
            });
            $rootScope.selectedDrawingTool = 'select';
            $rootScope.selectedAnnotationGuid = null;
        });
    }

    angular.module('GroupDocsAnnotationApp').controller('PageCanvasController', main);
})();

