(function () {
    'use strict';

    function main($rootScope, cfpLoadingBar, AnnotationFactory, AnnotationAddFactory) {
        return {
            restrict: 'E',
            link: {
                pre: function (scope, element, attrs) {
                },
                post: function (scope, element, attrs) {
                    setupCanvas($rootScope, scope, element, attrs);
                    setupPageImage($rootScope, scope, element, attrs);
                    setupDrawingTools($rootScope, AnnotationFactory, AnnotationAddFactory, scope, element, attrs);
                    // setupAnnotations has been moved to pageImage.onLoad
                    setupAnnotationDeletion($rootScope, AnnotationFactory, scope, element, attrs);
                }
            }
        }
    }

    function setupCanvas($rootScope, scope, element, attrs) {
        element.css('width', attrs.width + 'px');
        element.css('height', attrs.height + 'px');

        var canvas = document.createElement("canvas");
        canvas.setAttribute('width', attrs.width);
        canvas.setAttribute('height', attrs.height);
        canvas.setAttribute("id", "page-canvas-" + attrs.number);
        element.append(canvas);

        var paperScope = new paper.PaperScope();
        paperScope.setup(canvas);
        scope.paperScopeId = paperScope._id;
    }

    function setupPageImage($rootScope, scope, element, attrs) {
        var ps = paper.PaperScope.get(scope.paperScopeId);

        var pageImageUrl = "/page/image"
            + "?file=" + attrs.file
            + "&page=" + attrs.number
            + "&width=" + attrs.width
            + "&height=" + attrs.height;

        var loadingIndicator = new ps.Raster({
            source: '/loading_indicator.gif',
            position: ps.view.center
        });

        var pageImage = new ps.Raster({
            source: pageImageUrl,
            position: ps.view.center
        });

        pageImage.onLoad = function () {
            pageImage.scale(attrs.width / pageImage.width);
            setupAnnotations($rootScope, scope, element, attrs);
            loadingIndicator.remove();
        };
    }

    function setupDrawingTools($rootScope, AnnotationFactory, AnnotationAddFactory, scope, element, attrs) {
        var ps = paper.PaperScope.get(scope.paperScopeId);

        var currentObject = null;
        var textRowMouseDown;
        ps.tool = new ps.Tool();
        ps.tool.minDistance = 3;

        ps.tool.onMouseDown = function (event) {
            var hitResult = ps.project.activeLayer.hitTest(event.point, {
                segments: true,
                stroke: true,
                fill: true,
                tolerance: 0
            });

            ps.project.deselectAll();

            switch ($rootScope.selectedDrawingTool) {
                case 'select':
                    if (hitResult && hitResult.item.name) {
                        currentObject = hitResult.item;
                        currentObject.selected = true;
                        $rootScope.selectedAnnotationGuid = currentObject.name;
                        if (!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                    }
                    else if (hitResult && hitResult.item._parent._name) {
                        currentObject = hitResult.item._parent;
                        currentObject.selected = true;
                        $rootScope.selectedAnnotationGuid = currentObject._name;
                        if (!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                    }
                    break;
                case 'rectangle':
                    var shape = new ps.Rectangle(event.point.x, event.point.y, 1, 1);
                    currentObject = new ps.Path.Rectangle(shape);
                    currentObject.strokeColor = 'black';
                    currentObject.strokeWidth = 2;
                    break;
                case 'pencil':
                    currentObject = new ps.Path();
                    currentObject.add(event.point);
                    currentObject.strokeColor = 'black';
                    currentObject.strokeWidth = 2;
                    break;
                case 'point':
                    var pt = new ps.Shape.Circle(event.point, 3);
                    currentObject = pt.toPath(true);
                    currentObject.strokeColor = 'black';
                    currentObject.fillColor = 'black';
                    currentObject.strokeWidth = 2;
                    break;
                case 'underline':
                case 'strikeout':
                    textRowMouseDown = findRowUnderPoint($rootScope.docInfo, attrs.number, event.point);
                    currentObject = new ps.Path.Rectangle(new ps.Rectangle(
                        event.point.x,
                        textRowMouseDown.lineTop,
                        1,
                        textRowMouseDown.lineHeight)
                    );
                    currentObject.fillColor = 'black';
                    currentObject.opacity = 0.3;
                    break;
            }
        };

        ps.tool.onMouseDrag = function (event) {
            switch ($rootScope.selectedDrawingTool) {
                case 'select':
                    var currentAnnotation = findAnnotationByGuid(scope.annotationsList, $rootScope.selectedAnnotationGuid);
                    if (currentObject !== null && currentAnnotation !== null) {
                        if ([3, 4, 8, 11].indexOf(currentAnnotation.annotation.type) < 0) {
                            currentObject.position.x += event.delta.x;
                            currentObject.position.y += event.delta.y;
                        } else {
                            currentObject = null;
                        }
                    }
                    break;
                case 'rectangle':
                    currentObject.bounds.width += event.delta.x;
                    currentObject.bounds.height += event.delta.y;
                    break;
                case 'pencil':
                    currentObject.add(event.point);
                    break;
                case 'point':
                    currentObject.position.x += event.delta.x;
                    currentObject.position.y += event.delta.y;
                    break;
                case 'underline':
                case 'strikeout':
                    if (currentObject !== null) {
                        if (currentObject.bounds.x + currentObject.bounds.width + event.delta.x <= textRowMouseDown.lineWidth) {
                            currentObject.bounds.width += event.delta.x;
                        }
                    }
                    break;
                case 'arrow':
                    if (currentObject) {
                        currentObject.remove();
                    }
                    var start = new ps.Point(event.downPoint);
                    var end = new ps.Point(event.point);

                    var tailLine = new ps.Path.Line(start, end);
                    var tailVector = end.subtract(start);
                    var headLine = tailVector.normalize(10);

                    currentObject = new ps.Group([
                        new ps.Path([start, end]),
                        new ps.Path([
                            end.add(headLine.rotate(150)),
                            end,
                            end.add(headLine.rotate(-150))
                        ])
                    ]);
                    currentObject.strokeColor = 'black';
                    currentObject.strokeWidth = 2;
                    break;
                case 'distance':
                    if (currentObject) {
                        currentObject.remove();
                    }
                    var start = new ps.Point(event.downPoint);
                    var end = new ps.Point(event.point);
                    var textX = (start.x + end.x) / 2;
                    var textY = (start.y + end.y) / 2;
                    var textPoint = new ps.Point(textX, textY);
                    var tailLine = new ps.Path.Line(start, end);
                    var textPosition = end.add(start);
                    var tailVector = end.subtract(start);
                    var headLine = tailVector.normalize(10);
                    var tailArrow = tailVector.normalize(-10);
                    currentObject = new ps.Group([
                        new ps.Path([start, end]),
                        new ps.Path([
                            end.add(headLine.rotate(150)),
                            end,
                            end.add(headLine.rotate(-150))
                        ]),
                        new ps.Path([
                            start.add(tailArrow.rotate(-150)),
                            start,
                            start.add(tailArrow.rotate(150))
                        ]),
                        new ps.PointText(textPoint)
                    ]);

                    currentObject.strokeColor = 'black';
                    currentObject.strokeWidth = 2;
                    currentObject._children[3].content = Math.floor(currentObject._children[0].length) + " px";
                    currentObject._children[3].strokeWidth = 0.5;
                    break;
            }
        };

        ps.tool.onMouseUp = function (event) {
            var ant = {};

            switch ($rootScope.selectedDrawingTool) {
                case 'select':
                    if (currentObject && (event.delta.x !== 0 || event.delta.y !== 0)) {
                        AnnotationFactory.updatePosition(
                            {
                                guid: currentObject.name
                            },
                            {
                                x: currentObject.bounds.x,
                                y: currentObject.bounds.y
                            }
                        );
                    }
                    break;
                case 'rectangle':
                    ant = {
                        box: {
                            x: currentObject.bounds.x,
                            y: currentObject.bounds.y,
                            width: currentObject.bounds.width,
                            height: currentObject.bounds.height
                        },
                        type: 1
                    };
                    break;
                case 'pencil':
                    ant.type = 4;
                    ant.svgPath = extractSvgPathData(currentObject);
                    break;
                case 'point':
                    ant = angular.merge({}, ant, {
                        type: 2,
                        box: {
                            x: event.point.x,
                            y: event.point.y,
                            width: 0,
                            height: 0
                        }
                    });
                    break;
                case 'arrow':
                    ant.type = 8;
                    ant.svgPath = extractSvgPathData(currentObject);
                    break;
                case 'distance':
                    ant = {
                        type: 12,
                        svgPath: extractSvgPathData(currentObject),
                        fieldText: currentObject.children[3].content,
                        box: {
                            x: currentObject.children[3].position.x,
                            y: currentObject.children[3].position.y,
                            width: 0,
                            height: 0
                        }
                    };
                    break;
                case 'underline':
                case 'strikeout':
                    if (currentObject !== null) {
                        ant = angular.merge({}, ant, {
                            svgPath: JSON.stringify([
                                {
                                    X: currentObject.bounds.x,
                                    Y: attrs.height - currentObject.bounds.y
                                },
                                {
                                    X: currentObject.bounds.x + currentObject.bounds.width,
                                    Y: attrs.height - currentObject.bounds.y
                                },
                                {
                                    X: currentObject.bounds.x,
                                    Y: attrs.height - currentObject.bounds.y - currentObject.bounds.height
                                },
                                {
                                    X: currentObject.bounds.x + currentObject.bounds.width,
                                    Y: attrs.height - currentObject.bounds.y - currentObject.bounds.height
                                }
                            ]),
                            box: {
                                x: currentObject.bounds.x,
                                y: attrs.height - currentObject.bounds.y,
                                width: currentObject.bounds.width,
                                height: currentObject.bounds.height
                            },
                            annotationPosition: {
                                x: currentObject.bounds.x,
                                y: attrs.height - currentObject.bounds.y
                            }
                        });
                        currentObject.remove();
                        switch ($rootScope.selectedDrawingTool) {
                            case 'underline':
                                currentObject = new ps.Path.Line({
                                    from: [
                                        currentObject.bounds.x,
                                        currentObject.bounds.y + currentObject.bounds.height
                                    ],
                                    to: [
                                        currentObject.bounds.x + currentObject.bounds.width,
                                        currentObject.bounds.y + currentObject.bounds.height
                                    ],
                                    strokeColor: 'black'
                                });
                                ant = angular.merge({}, ant, {type: 11});
                                break;
                            case 'strikeout':
                                currentObject = new ps.Path.Line({
                                    from: [
                                        currentObject.bounds.x,
                                        currentObject.bounds.y + currentObject.bounds.height / 2.0
                                    ],
                                    to: [
                                        currentObject.bounds.x + currentObject.bounds.width,
                                        currentObject.bounds.y + currentObject.bounds.height / 2.0
                                    ],
                                    strokeColor: 'black'
                                });
                                ant = angular.merge({}, ant, {type: 3});
                                break;
                        }
                    }
                    break;
            }

            if (ant.type) {
                ant = angular.merge({}, ant, {
                    penColor: 0x010101,
                    penStyle: 1,
                    penWidth: 2,
                    pageNumber: attrs.number
                });
                var a = new AnnotationAddFactory(ant);
                a.$save({filename: $rootScope.selectedFile}, function (response) {
                    currentObject.name = response.guid;
                    currentObject.selected = true;
                    currentObject = null;
                    $rootScope.selectedAnnotationGuid = response.guid;
                    if (!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                });
            } else {
                currentObject = null;
            }
        };

        ps.tool.onMouseMove = function (event) {
            switch ($rootScope.selectedDrawingTool) {
                case 'underline':
                case 'strikeout':
                    var r = findRowUnderPoint($rootScope.docInfo, attrs.number, event.point);
                    if (typeof(r) !== 'undefined') {
                        document.body.style.cursor = 'text';
                    } else {
                        document.body.style.cursor = 'auto';
                    }
            }
        };

        ps.tool.onKeyDown = function (event) {
            if (event.key === 'delete') {
                angular.forEach(ps.project.selectedItems, function (item) {
                    if (item.name) {
                        $rootScope.$broadcast('request-annotation-deletion', item.name);
                    }
                    else if (item._parent._name) {
                        $rootScope.$broadcast('request-annotation-deletion', item._parent._name);
                    }

                });
            }
        }
    }

    function setupAnnotations($rootScope, scope, element, attrs) {
        var ps = paper.PaperScope.get(scope.paperScopeId);

        scope.$watch('annotationsList', function () {

        });

        angular.forEach(scope.annotationsList, function (item) {

            if (attrs.number != item.annotation.pageNumber) {
                return;
            }

            switch (item.annotation.type) {
                case 1:

                    var shape = new ps.Rectangle(
                        item.annotation.box.x,
                        item.annotation.box.y,
                        item.annotation.box.width,
                        item.annotation.box.height
                    );
                    var path = new ps.Path.Rectangle(shape);
                    path.strokeColor = 'black';
                    path.strokeWidth = 2;
                    path.name = item.annotation.guid;

                    break;

                case 5:
                    var line = new ps.Path();
                    line.pathData = item.annotation.svgPath;
                    line.strokeColor = 'black';
                    line.strokeWidth = 2;
                    line.name = item.annotation.guid;

                    break;
                case 4:
                    var line = new ps.Path();
                    line.pathData = item.annotation.svgPath;
                    line.strokeColor = 'black';
                    line.strokeWidth = 2;
                    line.name = item.annotation.guid;

                    break;
                case 2:
                    var pt = new ps.Shape.Circle(new ps.Point(item.annotation.box.x + 3, item.annotation.box.y + 3), 3);
                    var ptp = pt.toPath(true);
                    ptp.strokeColor = 'black';
                    ptp.fillColor = 'black';
                    ptp.strokeWidth = 2;
                    ptp.name = item.annotation.guid;
                    break;
                case 8:
                    var arrow = new ps.Group([
                        new ps.Path(item.annotation.svgPath.split(" ")[0]),
                        new ps.Path(item.annotation.svgPath.split(" ")[1])
                    ]);
                    arrow.strokeColor = 'black';
                    arrow.strokeWidth = 2;
                    arrow.name = item.annotation.guid;
                    break;
                case 11:
                    var line11 = new ps.Path.Line({
                        from: [
                            JSON.parse(item.annotation.svgPath)[2].X,
                            attrs.height - JSON.parse(item.annotation.svgPath)[2].Y
                        ],
                        to: [
                            JSON.parse(item.annotation.svgPath)[3].X,
                            attrs.height - JSON.parse(item.annotation.svgPath)[3].Y
                        ],
                        strokeColor: 'black',
                        strokeWidth: 1,
                        name: item.annotation.guid
                    });
                    break;
                case 3:
                    var line3 = new ps.Path.Line({
                        from: [
                            JSON.parse(item.annotation.svgPath)[2].X,
                            attrs.height - (JSON.parse(item.annotation.svgPath)[0].Y + JSON.parse(item.annotation.svgPath)[2].Y) / 2.0
                        ],
                        to: [
                            JSON.parse(item.annotation.svgPath)[3].X,
                            attrs.height - (JSON.parse(item.annotation.svgPath)[1].Y + JSON.parse(item.annotation.svgPath)[3].Y) / 2.0
                        ],
                        strokeColor: 'black',
                        strokeWidth: 1,
                        name: item.annotation.guid
                    });
                    break;
                case 12:
                    var distance = new ps.Group([
                        new ps.Path(item.annotation.svgPath.split(" ")[0]),
                        new ps.Path(item.annotation.svgPath.split(" ")[1]),
                        new ps.Path(item.annotation.svgPath.split(" ")[2]),
                        new ps.PointText(new ps.Point(item.annotation.box.x, item.annotation.box.y))
                    ]);
                    distance.strokeColor = 'black';
                    distance.strokeWidth = 2;
                    distance.children[3].content = Math.floor(distance.children[0].length) + " px";
                    distance.children[3].strokeWidth = 0.5;
                    distance.name = item.annotation.guid;
                    break;
            }
        })
    }

    function getStartRow(docInfo, start, attrs) {
        var startRow = [];
        for (var i = 0; i < 30; i++) {
            startRow = docInfo.pages[attrs.number].rows.filter(function (x) {
                    Math.floor(x.lineTop) == (Math.floor(start.y) - i )
                }
            )
            ;
            if (startRow.length > 0)
                return startRow;
        }
        if (startRow.length == 0)
            for (var i = 0; i < 30; i++) {
                startRow = docInfo.pages[attrs.number].rows.filter(function (x) {
                    return Math.floor(x.lineTop) == (Math.floor(start.y) + i )
                });
                if (startRow.length > 0)
                    return startRow;
            }

    }

    function setupAnnotationDeletion($rootScope, AnnotationFactory, scope, element, attrs) {
        var ps = paper.PaperScope.get(scope.paperScopeId);

        $rootScope.$on('request-annotation-deletion', function (event, guid) {
            if (typeof(guid) !== 'string') {
                return;
            }

            var item = ps.project.activeLayer.children[guid];
            if (item) {
                AnnotationFactory
                    .remove({guid: guid})
                    .$promise
                    .then(function (response) {
                        item.remove();
                        ps.project.deselectAll();
                        $rootScope.selectedAnnotationGuid = null;
                        if (!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                    });
            }

        });
    }

    function extractSvgPathData(object) {
        var svg = object.exportSVG();
        var data = '';

        if (svg.nodeName === 'path') {
            data = object.exportSVG().getAttribute('d')
        } else if (svg.nodeName === 'g') {
            angular.forEach(svg.children, function (value) {
                if (value.nodeName === 'path') {
                    data += value.getAttribute('d');
                    data += ' ';
                }
            });
        }

        return data;
    }

    function findRowUnderPoint(docInfo, page, point) {
        var currentRow = docInfo.pages[page].rows.filter(function (row) {
            return row.lineLeft <= point.x && point.x <= row.lineLeft + row.lineWidth
                && row.lineTop <= point.y && point.y <= row.lineTop + row.lineHeight;
        });

        return currentRow[0];
    }

    function findAnnotationByGuid(annotationInfo, guid) {
        var a = annotationInfo.filter(function (item) {
            return item.annotation.guid === guid;
        });

        if (a.length > 0) {
            return a[0];
        }

        return null;
    }

    angular.module('GroupDocsAnnotationApp').directive('gdxAnnoPage', main, ['cfpLoadingBar']);

})();

