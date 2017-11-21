(function () {
    'use strict';

    function main($rootScope, $scope, AnnotationListFactory, DocumentInfoFactory) {

        $rootScope.docInfo = DocumentInfoFactory.get();
        $scope.annotationsList = AnnotationListFactory.query();
        $rootScope.selectedDrawingTool = 'select';        
    }
    angular.module('GroupDocsAnnotationApp').controller('PageCanvasController', main);
})();

