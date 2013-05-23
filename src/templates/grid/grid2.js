$(function() {
TESTING = 0;
var GridApp = function (chart, inputBox ) {

	windowWidth = $(inputBox).width();
	windowHeight = $(inputBox).height();

	var container = document.createElement('div');
	inputBox.appendChild(container);

	$(container).width = windowWidth;
	$(container).height = windowHeight;

	$(container).css(
	    {'background-image': "url('noise_lines.png')"}
	);
	$(container).css(
	    {'background': "white"}
	);

	Grid = {
		'title': chart.title,
		'nodes': [],
		'fillNodes': [],
		'getNode': function (id) {
			return _.find(this.nodes, function (node) {
				return node.id == id;
			});
		},
		'getStart': function ( ) {
			//temporary fix for:
			//if (this.nodes[each].type === "start")
			return _.find(this.nodes, function (node) {
				return node.id == 0;
			});
		},
		//optional callback parameter
		'next': function ( ) {
			var node = _.find(this.nodes, function(node) {
			    return node.found == 0 && node.round == 0;
			});	
			if(arguments.length == 1) {
				if(typeof node == 'object') {
					callback = arguments[0];
					return callback(node);
				}
				else {
					return -1;
				}
			}
			else {
				return node;
			}
		},
		'resetRounds': function ( ) {
			_.each(this.nodes, function(node, key){
			    node.round = 0;
			});
		},
		'nodesToPlace': function ( ) {
			var count = 0;
			_.each(this.nodes, function(node, key){
			    if(node.found == 0) {
			    	count++;
			    }
			});
			return count;
		}
	}
	var buffer 		= 10;
	var boxBuffer 	= 2;
	var paths 		= chart.arrows;
	var stack 		= [];
	var aColor 		= '#FF2C18';
	var aFontFill 	= '#FFFFFF';
	var qsColor 	= '#1ba1e2';
	var qsFontFill 	= '#FFFFFF';
	var newDiv		= '<div></div>';
	var fontSize 	= 0;
	var found 		= 0;
	var countBoxes 	= 0;

	/*
	*	Chose nuberOf based on windowWidth, if windowWidth is negligable throw error 
	*	or simply set minimum 
	* 	?????
	*/

	numberOf = 8;
	smallestDimension = Math.floor((windowWidth - (numberOf+2)*boxBuffer) / numberOf);
	//console.log('Smallest Dimension: '+ smallestDimension);
	var boxSizes = [
			{'x': smallestDimension, 'y': smallestDimension },
			{'x': smallestDimension*2+boxBuffer, 'y': smallestDimension },
			{'x': smallestDimension*2+boxBuffer, 'y': smallestDimension*2+boxBuffer },
			{'x': smallestDimension*4+boxBuffer*3, 'y': smallestDimension*2+boxBuffer },
			{'x': smallestDimension*4+boxBuffer*3, 'y': smallestDimension*4+boxBuffer*3 }
	]

	
	
	//Node initialization function
	var Node = function ( ) {
		var provDat;

		if(arguments.length == 1) {
			provDat = arguments[0];
		}
		else {
			console.log('Node probDat');
			provDat = {
				'x': arguments[0],
				'y': arguments[1],
				'width': arguments[2],
				'height': arguments[3]
			}
		}
		var current = 99999999; //get rid of

		this.paths 		= [];
		this.adjacent	= [];
		this.id 		= provDat.id;
		this.data 		= provDat.data;

		if(arguments.length == 1) {
			this.optSize	= {'x': 0, 'y': 0};
			// IMPORTANT NOTE:
			// CSS needs to start so that .box is just big enough for text and 
			// then after optimal ratio is computed, changed to stick to those dimensions
			this.box 		= $(newDiv).appendTo(container).addClass('box').attr('id',this.id).text(this.data);
			//this.text 		= $(newDiv).appendTo(this.box).addClass('text');
			// Assumes that the box is just big enough for the text
			// JQuery could be incorrect.
			this.textArea 	= this.box.outerWidth() * this.box.outerHeight();
			//setup size based on space taken by text
			_.each(boxSizes, (function (size,index) {

				var computeSize 		= (size.x)*(size.y);
				var diff 				= computeSize - this.textArea;
				//2000 from minor testing
				var wordWrapErrorFactor = 1000;
				this.box.outerWidth(size.x);
				//console.log(diff + ', ' + current + ': '+ (this.box.outerWidth()) + ', ' + size.x);	
				if( diff < current) {
					// change box width to next size.x
				//	console.log('height:' + this.box.outerHeight() + ', ' + size.y);
					if(this.box.outerHeight() < size.y ) {
				//		console.log('selected');
						this.optSize = size;
						current = diff;
						countBoxes += 1;
					}
				}
				

			}).bind(this));

			// At this point set sizes and switch height to firm instead of end of text
			//this.box.attr(FIRM);
			this.box.outerWidth(this.optSize.x);
			this.box.outerHeight(this.optSize.y);
			this.box.empty();
			this.text = $(newDiv).appendTo(this.box).addClass('text').text(this.data);
			this.text.width(this.box.width());
			this.text.css('margin-left', - (this.text.outerWidth() / 2 ) );
			this.text.css('margin-top', - (this.text.outerHeight() / 2 ) );

			this.textArea 	= this.box.outerWidth() * this.box.outerHeight();
			//bind width and height to shorter variables

			//IN PROGRESS - NOT OLD
			// CONVERTING TO SUPPORT AUTO NODE SIZE GENERATION
			/*
			var sizeFound	= 0;
			var loopCount 	= 1;
			var curX 		= smallestDimension;
			var curY		= smallestDimension;
			var scale		= 2;
			//?? BASE OFF SIZE OF SMALLEST
			var wordWrapErrorFactor = 2000;

			while(!sizeFound) {
				var computeSize 	= (curX - buffer * 2)*(curY - buffer * 2);
				var diff 			= computeSize - this.textArea;

				if(diff > wordWrapErrorFactor) {
					computeTextBox(curX);
					if(this.text.getBBox().height < curY ) {
						this.box.attr({'width': curX, 'height': curY});
						this.width 	= curX;
						this.height 	= curY;
						sizeFound = 1;
					}
				}
				console.log(scale);
				scale *= 2;
				if(loopCount % 2 == 1) {

					curX = smallestDimension*(scale) + boxBuffer*(scale-1);
				}
				else {
					curY = smallestDimension*(scale) + boxBuffer*(scale-1);
				}
				loopCount++;

			}
			if(!sizeFound)
				console.log('not found');
			*/
			//console.log("width: "+this.width);
		}
		else {
			this.box = $(newDiv).appendTo(container)
								.addClass('box')
								.outerWidth(provDat.width)
								.outerHeight(provDat.height)
								.css({'left': provDat.x + 'px', 'top': provDat.y + 'px'});
		}
		this.round = 0;
		this.found = 0;
		this.width = this.box.outerWidth();
		this.height = this.box.outerHeight();
		this.setX = function (x) {
			this.box.css({'left': x+'px'});
		}
		this.setY = function (y) {
			this.box.css({'top': y+'px'});
		}
		this.getTopRight = function ( ) {
			return { 'x': parseInt(this.box.css('left')) + this.box.outerWidth() , 'y': parseInt(this.box.css('top')) };
		}
		this.getTopLeft = function ( ) {
			return { 'x': parseInt(this.box.css('left')) , 'y': parseInt(this.box.css('top')) };
		}
		this.getBottomRight = function ( ) {
			return { 'x': parseInt(this.box.css('left')) + this.box.outerWidth() , 'y': parseInt(this.box.css('top')) + this.box.outerHeight() };
		}
		this.getBottomLeft = function ( ) {
			return { 'x': parseInt(this.box.css('left')) , 'y': parseInt(this.box.css('top')) + this.box.outerHeight() };
		}
		if(arguments.length == 1) {
			this.checkForAdjacencies = (function ( ) {
				_.each(paths, (function (path) {
					// console.log(this.id);
					if(this.id === path.from) {
						this.adjacent.push(Grid.getNode(path.to));
					}
				}).bind(this));
			}).bind(this);	
		}
	}

	//initialization Loop
	_.each(chart.nodes, function (data) {
		//node.adjacent = checkForAdjacencies(node);
		Grid.nodes.push(new Node(data));
	});

	// console.log('nodes: '+chart.nodes.length);
	// console.log('boxes: '+countBoxes);
	// 
	//console.log(Grid);

	//REVISE linkage

	
	_.each(Grid.nodes, function(node, key){
	    node.checkForAdjacencies();
	    // console.log(node.adjacent);
	});

	//Layout procedure

	var zones = {
		l: [],
		'add': function (x,y,w,p) {
			z = {};
			z.priority = p;
			z.toBeDeleted = 0;
			z.x = x;
			z.y = y;
			z.width = w;

			if(TESTING)
			z.div = $(newDiv).appendTo(container).css('background','yellow')
			.css({'position':'absolute', 'left': z.x + 'px','top': (z.y+3) + 'px', 'width': z.width+'px', 'height': '5px'}).text(z.priority);

			z.endX = function ( ) {
				return this.x + this.width;
			}
			z.used = function (width) {
				this.width -= (width+boxBuffer);
				this.x += boxBuffer + width;
				if(TESTING)
				this.div.css({'width': this.width+'px', 'left':this.x + 'px'});
			}
			z.added = function (width) {
				this.width += (width+boxBuffer);
				// if(TESTING)
				// this.pap.attr({'width':this.width});			
			}
			this.l.push(z);
		}
	}
	zones.add(boxBuffer,boxBuffer, windowWidth - boxBuffer*2,1);
	if(TESTING) {
		// paper.rect(0,0,windowWidth - boxBuffer*2,1);
	}

	var combineAndDeleteZones = function () {
		_.each(zones.l, function (zone1,index1) {
			_.each(zones.l, function (zone2,index2) {
				if(zone1.y == zone2.y && !zone1.toBeDeleted && !zone2.toBeDeleted ) {
					if(zone1.x == zone2.endX()+boxBuffer ) {
						zone2.added(zone1.width);
						zone1.toBeDeleted = 1;
					}
					else if(zone1.endX() + boxBuffer == zone2.x ) {
						zone1.added(zone2.width);
						zone2.toBeDeleted = 1;
					}
				}
			});
		});
		_.each(zones.l, function (zone,index) {
			if(zone.toBeDeleted) {
				zones.l.splice(index,1);
			}
		});
	}

	// countBoxes = 0;
	// _.each(Grid.nodes, function (node) {
	// 	//find next zone that fits width
	// 	found = 0;
	// 	zones.l = _.sortBy(zones.l, function (zone) {
	// 		//FIX TO: sort by smallest within 2 layers
	// 		return zone.priority;
	// 	});

	// 	_.each(zones.l, function (zone,index) {
	// 		//console.log('width: '+node.width+', zonewidth: '+zone.width);
	// 		if(Math.floor(1000*node.width)/1000 <= Math.floor(1000*zone.width)/1000 && !found) {
	// 			found = 1;
	// 			//place node
	// 			node.setX(zone.x);
	// 			node.setY(zone.y);

	// 			//adjust zone for used space
	// 			zone.used(node.width);
	// 			//retrieve node coordinates
	// 			var coordinates = node.getBottomLeft();
	// 			//add new zone below node
	// 			zones.add(coordinates.x, coordinates.y + boxBuffer, node.width, zone.priority+boxBuffer+node.height);

	// 			//check and destroy if zone z must be removed
	// 			if(zone.width <= 0) {
	// 				zones.l.splice(index,1);
	// 			}
	// 			node.found = 1;
	// 		}
	// 	//Try to combine zones
	// 	combineAndDeleteZones();

	// 	});
	// 	if(!found)
	// 		console.log('no zone found');
	// });
	// 
	// 
	// FIX THIS: PROBABLY BY GOING UP TO GRID.NEXT AND ADDING PROGRESS
	// 
	// 
	var next = function (node) {

		zones.l = _.sortBy(zones.l, function (zone) {
			//FIX TO: sort by smallest within 2 layers
			return zone.priority;
		});
		_.each(zones.l, function (zone,index) {
			//console.log('width: '+node.width+', zonewidth: '+zone.width);
			if(Math.floor(1000*node.width)/1000 <= Math.floor(1000*zone.width)/1000 && !node.found) {

				//place node
				node.setX(zone.x);
				node.setY(zone.y);

				//adjust zone for used space
				zone.used(node.width);
				//retrieve node coordinates
				var coordinates = node.getBottomLeft();
				//add new zone below node
				zones.add(coordinates.x, coordinates.y + boxBuffer, node.width, zone.priority+boxBuffer+node.height);

				//check and destroy if zone z must be removed
				if(zone.width <= 0) {
					zones.l.splice(index,1);
				}
				node.found = 1;
			}
		//Try to combine zones
		combineAndDeleteZones();

		});			
		node.round = 1;
		return node.found;
	}

	var fillSpace = function ( ) {
		_(zones.l).each( function (zone,index) {	
			if(zone.priority != maxDepth) {
				var node = new Node(zone.x,zone.y,zone.width,maxDepth-zone.y-1);
				Grid.fillNodes.push(node);
				//adjust zone for used space
				zone.used(node.width);
				//retrieve node coordinates
				var coordinates = node.getBottomLeft();
				//add new zone below node
				zones.add(coordinates.x, coordinates.y + boxBuffer, node.width, zone.priority+boxBuffer+node.height);

				//check and destroy if zone z must be removed
				if(zone.width <= 0) {
					zones.l.splice(index,1);
				}				
			}
		});
		//Try to combine zones
		combineAndDeleteZones();		
	}
	// INFINITE
	var success = 0;
	var count 	= 0;
	// while(Grid.next()) {
	// 	success = 0;
	// 	Grid.resetRounds();
	// 	count 	= Grid.nodesToPlace();
	// 	//Try placing next node
	// 	while((!success || success != -1) && !count) {
	// 		success = Grid.next(next);
	// 		if(success == -1) {

	// 		}
	// 		//console.log(success);
	// 		count--;
	// 		console.log(count);
	// 		if(count == 0) {
	// 			fillSpace();
	// 		}
	// 	}	

	// }
	var count = 0;
	while(success != -1) {
		success = Grid.next(next);
		count++;
	}

	console.log(zones.l);

	//find the lowest priority zone which is the bottom edge
	var maxDepth = 0;
	_.each(zones.l, function (zone) {
		if(zone.priority > maxDepth) {
			maxDepth = zone.priority; 
		}
	});


	// var start = function (node) {
	// 	// Remove all effects
	// 	// Add effects to node
	// 	_.each(node.adjacent, function(adj, key){
	// 		// add effect to adjacent
	// 		// add click functions to adjacent
	// 	});
	// }

	// var radius = 75;
	// paper.circle(windowWidth / 2, windowHeight / 2, radius).attr({
	// 	'stroke': 'white',
	// 	'stroke-width': 3,
	// 	'fill': '#999999'
	// }).click( function ( ) {
	// 	this.remove();
	// 	start();
	// });

}

/******************************
*	Temporary JSON Retrieval
*
******************************/
var chart = [];

$.ajax({
	url: 'chart.json',
	async: false,
	dataType: 'json',
	success: function(data) {
		chart = data;
	},
	error: function(e,header) {
		console.log(header);
	}
});//close ajax

GridApp(chart,document.getElementById('inputBox'));

});