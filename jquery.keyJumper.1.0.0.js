/**
 * jquery.keyJumper
 *
 * Version:     1.0.0
 * Last Update: 2012/12/23
 * Manuel Bitto (manuel.bitto@gmail.com)
 *
 * This plugin is intended to help keyboard navigation through html nodes.
 *
 */

 (function($) {

    var _options,
        knownElements = [],
        currentElement = null,
        $currentElement = null,
        canMove = true,
        onAfterChange = [];

    var init = function(options) {

        _options = $.extend({
            navigableClass : '',
            onClass : '',
            offClass : '',
            areaToScanX : 1500,
            areaToScanY : 1500
        }, options);

        if(currentElement === null){
            currentElement = $('.' + _options.onClass).not(":hidden").first()[0];
            if(typeof currentElement === "undefined"){
                currentElement = $('.' + _options.navigableClass).first();
                currentElement.addClass(_options.onClass);
            }
            $currentElement = $(currentElement);
        }

        var inputOrTextarea = $currentElement.find('input', 'textarea');
        if(inputOrTextarea.length > 0){
            inputOrTextarea.trigger('focus');
        }
        else{
            $currentElement.trigger('focus');
        }

        // Register all the visible elements
        return this.each(function() {
            registerElement(this);
        });
    };

    // Register an element setting some interesting properties
    var registerElement = function(element) {
        var $element = $(element);

        // If element is hidden
        if($element.is(':hidden')){
            return false;
        }

        var elementPosition = getPosition(element),
            currentElementPosition = getPosition(currentElement),
            elementsYDistance = Math.abs(elementPosition.y - currentElementPosition.y),
            elementsXDistance = Math.abs(elementPosition.x - currentElementPosition.x);

        // Fix a strange behaviour of chrome (doesn't always recognize children of hidden elements as hidden)
        if(currentElementPosition.w === 0){
            return false;
        }

        // If element is out of scan area do nothing
        if(elementsXDistance > _options.areaToScanX || elementsYDistance > _options.areaToScanY){
            return false
        }

        $element.data('position', getPosition(element));
        $element.data('onClass', _options.onClass);
        $element.data('offClass', _options.offClass);
        $element.mouseover(function(){
            setActive(this);
        });
        knownElements.push(element);
    };

    // Get position of element
    var getPosition = function (element) {

        var $element = $(element),
            offsetLeft = $element.offset().left,
            offsetTop = $element.offset().top,
            outerHeight = $element.outerHeight(),
            outerWidth = $element.outerWidth(),
            centerX = Math.round(offsetLeft + (outerWidth / 2)),
            centerY = Math.round(offsetTop + (outerHeight / 2)),
            outerBottomY = Math.round(centerY + (outerHeight / 2)),
            outerRightX = Math.round(centerX + (outerWidth / 2));

        return {
            // Top-left corner coords
            x : offsetLeft,
            y : offsetTop,
            // Outer top center coords
            otx : centerX,
            oty : offsetTop,
            // Outer bottom center coords
            obx : centerX,
            oby : outerBottomY,
            // Outer left center coords
            olx : offsetLeft,
            oly : centerY,
            // Outer right center coords
            orx : outerRightX,
            ory : centerY
        };
    };

    // Find elements close to current element
    var findCloseElements = function(isClose){

        var closeElements = [];
        var currentElementPosition = $currentElement.data("position");


        // Check within each known element
        for(var i = 0; i < knownElements.length; i++) {
            var $knownElement = $(knownElements[i]);
            var knownElementPosition = $knownElement.data("position");

            // Check if known element is close to current element
            var isCloseElement = isClose(currentElementPosition, knownElementPosition, $currentElement, $knownElement);

            if(isCloseElement && currentElement != knownElements[i]) {
                closeElements.push(knownElements[i]);
            }
        }
        return closeElements;
    };

    // Activate closest element (if exist)
    var activateClosest = function(closeElements, direction, getDistance) {

        var closestElement,
            closestDistance,
            distance,
            currentElementPosition = $currentElement.data("position");

        // Find closest element within the close elements
        closestFound:   //How cool is this?
            for(var i = 0; i < closeElements.length; i++) {
                var $closeElement = $(closeElements[i]);

                // If we found an helper we try to use it
                if(elementHasHelper($closeElement)){
                    var helperContent = getHelperContent($closeElement);
                    // Helper content match current element and direction
                    for(var j=0; j<helperContent[direction].length; j++){
                        if(helperContent[direction][j] !== "null" && $currentElement.hasClass(helperContent[direction][j])){
                            closestElement = closeElements[i];
                            break closestFound;
                        }
                    }
                }

                var closeElementsPosition = $(closeElements[i]).data("position");

                // Find distance between 2 elements
                distance = getDistance(currentElementPosition, closeElementsPosition);

                // Check if is the closest found yet
                if(typeof closestDistance === "undefined" || distance < closestDistance) {
                    closestDistance = distance;
                    closestElement = closeElements[i];
                }
            }

        // If closest element is found activate it
        if(typeof closestElement !== "undefined"){
            setActive(closestElement);
        }
    };

    var elementHasHelper = function(element){
        return typeof element.data("keynav-helper") !== "undefined";
    };

    var getHelperContent = function(element){
        // Parse helper content
        var helperContentArray = element.data("keynav-helper").split(" ");
        // Order is intentionally reverted if compared to CSS style directions, because we want to get the direction
        // of the current element from the receiver element point of view
        return{
            down : helperContentArray[0].split("_"),
            left: helperContentArray[1].split("_"),
            up: helperContentArray[2].split("_"),
            right: helperContentArray[3].split("_")
        }
    };

    // Manage keyboard events
    var eventsManager = function(event){
        if(canMove){

            var closeElements;
            switch(event.keyCode){
                case 37:    // Left
                    closeElements = findCloseElements(function(current, other){
                        return current.olx >= other.orx;
                    });
                    activateClosest(closeElements, 'left', function(current, other){
                        return Math.sqrt(Math.pow(current.olx - other.orx, 2) + Math.pow(current.oly - other.ory, 2));
                    });
                    break;
                case 38:    // Up
                    closeElements = findCloseElements(function(current, other){
                        return current.oty >= other.oby;
                    });
                    activateClosest(closeElements, 'up', function(current, other){
                        return Math.sqrt(Math.pow(current.oty - other.oby, 2) + Math.pow(current.otx - other.obx, 2));
                    });
                    break;
                case 39:    // Right
                    closeElements = findCloseElements(function(current, other){
                        return current.orx <= other.olx;
                    });
                    activateClosest(closeElements, 'right', function(current, other){
                        return Math.sqrt(Math.pow(current.orx - other.olx, 2) + Math.pow(current.ory - other.oly, 2));
                    });
                    break;
                case 40:    // Down
                    closeElements = findCloseElements(function(current, other){
                        return current.oby <= other.oty;
                    });
                    activateClosest(closeElements, 'down', function(current, other){
                        return Math.sqrt(Math.pow(current.obx - other.otx, 2) + Math.pow(current.oby - other.oty, 2));
                    });
                    break;
                case 13:    // Enter
                    $currentElement.trigger('keynav.enter');
                    break;
                default: // nothing to do
            }
        }
    };

    // Set selected element as active
    var setActive = function(element, silently) {

        // Set active but tell no one
        silently = silently || false;

        var oldElement = currentElement;
        var $oldElement = $(oldElement);

        currentElement = element;
        $currentElement = $(currentElement);

        $oldElement.removeClass(_options.onClass).addClass(_options.offClass);
        $currentElement.removeClass(_options.offClass).addClass(_options.onClass);

        console.log($currentElement, !silently);

        if(!silently){
            if(onAfterChange !== null){
                $oldElement.trigger('blur');
                $currentElement.trigger('focus');
                $currentElement.trigger('changeSelected');
                for(var i = 0; i < onAfterChange.length; i++){
                    onAfterChange[i]($currentElement);
                }
            }
        }
    };

    var publicMethods = {

        // Get current element
        getCurrent : function(){
            return $currentElement;
        },

        // Set current element
        setCurrent : function(element, silently){
            if(typeof element[0] !== "undefined"){
                element = element[0];
            }
            setActive(element, silently);
            publicMethods.refresh.call(this);
        },

        // After change selected element event callback
        onAfterChange : function(callback){
            onAfterChange.push(callback);
        },

        // Lock movements
        lock : function(state){
            canMove = !state;
        },

        // Refresh keyNavigator
        refresh : function(){
            knownElements = [];
            currentElement = null;
            init.call(this, _options);
        },

        destroy : function(){
            knownElements = [];
            currentElement = null;
            $currentElement = null;
            canMove = true;
            onAfterChange = [];
            $(document).off('keyup.keyNavigator');
        }
    };

    // Plug keyNavigator in
    $.fn.keyNavigator = function(method){

        // We have a method like $('page').keyNavigator("setActive");
        if ( publicMethods[method] ) {
            return publicMethods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
        }
        // We have a initialization of keyNavigator
        else if ( typeof method === 'object' || ! method ) {
            $(document).on('keyup.keyNavigator', eventsManager);

            return init.apply( this, arguments );
        }
        // We've done something wrong here
        else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.keyNavigator' );
        }
    };
})(jQuery);