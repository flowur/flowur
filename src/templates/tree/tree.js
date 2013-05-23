$(function() {
/******************************************************
*	Tree Visualization
*
******************************************************/
var treeMain = function (chart, container) {

	TESTING = 1;
	TESTING2 = 1;

	var maxNodeWidth 	= 150;
	var nodeBuffer 		= 5;
	var spacingX 		= 20;
	var spacingY 		= 20;
	var aColor 			= '#FF2C18';
	var aFontFill 		= '#FFFFFF';
	var qsColor 		= '#FFFFFF';
	var qsFontFill 		= '#999999';
	var title 			= chart.title;
	var nodes 			= chart.nodes;
	var arrows 			= chart.arrows;
	var paths 			= [];
	var stack 			= [];

	var windowWidth 	= $(container).width();
	var windowHeight 	= $(container).height();

	var innerContainer 	= document.createElement('div');
	container.appendChild(innerContainer);

	$(innerContainer).width = windowWidth;
	$(innerContainer).height = windowHeight;

	//reuse variable to initialize large paper
	windowWidth 		= 5000;
	windowHeight 		= 5000;

	var viewPaper = Raphael(innerContainer,windowWidth,windowHeight);
	$(container).css(
	    {'background-image': "url('noise_lines.png')"}
	);	

	/***********************************************
	*	Initialize Tree Object and Helper functions
	*	
	***********************************************/
	var Tree = {
		nodes: [],
		getNode: function ( id ) {
			var node = _.find(this.nodes, function (node) {
				return node.id == id;
			});
			return node;
		},
		getStart: function ( ) {
				//temporary fix for:
				//if (this.nodes[each].type === "start")
			return _.find(this.nodes, function (node) {
				return node.id == 0;
			});
		},
		printPrePost: function ( ) {
			this.nodes = _.sortBy(this.nodes, function (node) { 
				return node.post;
			});
			_.each(this.nodes, function (val) {
				console.log(val.pre+", "+val.post);
			});
		},
		printNodes: function ( ) {
			_.each(this.nodes, function (val) {
				console.log(val.data);
			});
		},
		//returns array of nodes in given layer
		getLayer: function (layer) {
			var arr = [];
			_.each(this.nodes, function (node) {
				if(node.layer === layer) {
					arr.push(node);
				}
			});
			return arr;
		},
		//returns list of layer numbers
		listOfLayers: function ( ) {
			return _.uniq(_.pluck(Tree.nodes, 'layer'));
		},
		getLayers: function ( ) {
			var layers = this.listOfLayers();
			layers = _(layers).sortBy( function(value) {
			  return value;
			})
			var arr = [];
			var that = this;
			_.each(layers, function (val) {
				arr.push(that.getLayer(val));
			});
			this.layers = arr;
		}
	}

	//add 1 more necessary boolean to arrows
	_.each(arrows, function (arrow) {
		arrow.used = 0;
	});

	//should I add this to Node?
	var checkForAdjacencies = function (node) {
		var adjacencies = [];
		_.each(arrows, function (arrow) {
			if(node.id === arrow.from) {

				var retrievedNode = Tree.getNode(arrow.to);
				if(retrievedNode.used == 0) {
					arrow.used = 1;
					retrievedNode.used = 1;
					adjacencies.push(retrievedNode);
				}
				
			}
		});
		return adjacencies;
	}	
	var Node = function (node) {
		this.id 		= node.id;
		this.data 		= node.data;
		this.paths 		= [];
		this.parents 	= [];
		this.pre 		= -1;
		this.post 		= -1;
		this.layer 		= -1;
		this.zone 		= 0;
		this.zoneXpos 	= 0;
		this.xCurrent 	= 0;
		this.used 		= 0;
		this.designBox 	= viewPaper.rect(0,0,0,0).attr({
					'fill': qsColor,
					'stroke': '#999999', 
					'stroke-width': .5, 
					'stroke-linecap': "square"
		});
		this.textBox	= viewPaper.text(0,0).attr({
					'text-anchor': 'start',
				 	'font-family': "Helvetica Neue",
					'font-weight': 100,
					'fill': qsFontFill,
					'font-size': 18
		});
		this.setX = function (x) {
			this.designBox.attr({'x': x - this.designBox.attr('width') / 2});
			var offset = ( this.designBox.attr('width') - this.textBox.getBBox().width ) / 2;
			this.textBox.attr({'x': this.designBox.attr('x') + offset });
		}
		this.setY = function (y) {

			this.designBox.attr({'y': y});

			var halfTextHeight 	= this.textBox.getBBox().height / 2;
			var vertCenter 		= ( this.designBox.attr('height') - this.textBox.getBBox().height ) / 2;

			this.textBox.attr({'y': y+halfTextHeight+vertCenter});
		}
	}
	_.each(nodes, function (node) {
		Tree.nodes.push(new Node(node));
	});
	_.each(Tree.nodes, function (node) {
		node.adjacent = checkForAdjacencies(node);
	});

	/***************************
	*	Depth First Search
	***************************/
	var numbering 	= 1;
	var parent 		= 0;
	var start 		= Tree.getStart();

	//a starting node is required
	if(typeof start === undefined) {
		return;
	}

	//add Pre and Post numbering to nodes through depth first search procedure
	var dfs = function (node,layer) {
		//set nodes pre and then increment counter
		node.pre = numbering++;
		node.layer = layer; 
		//for each of the nodes adjacencies

		_.each(node.adjacent,function(adjacency) {

			//if it has not been visited
			if(adjacency.pre === -1) {
				//run dfs on adjacency
				adjacency.parents.push(node);
				dfs(adjacency,layer+1);
			}
		});
		node.post = numbering++;
	}
	//Run dfs to build Tree data structure
	dfs(start,0);

	//build layers // could change to just have Tree.layers
	Tree.getLayers();
	
	var maxTextWidth 	= maxNodeWidth - nodeBuffer*2;
	var currentY 		= 0;

	/**
	 * Initialize title, moved later based on center of chart
	 * 
	 */
	Tree.title = viewPaper.text(0,0).attr({	
		'text': title,'text-anchor': 'start',
	 	'font-family': "Helvetica Neue",
		'font-weight': 100,
		'fill': qsFontFill,
		'font-size': 80
	});

	//move the y-tracker down based on title height
	currentY += Tree.title.getBBox().height + spacingY*4;

	_.each(Tree.layers, function (layer) {

		var greatestTextHeightInLayer = 0;

		//initialize layer width to total spacing required
		layer.width = ( ( layer.length - 1 ) * spacingX );

			// For each node in the layer
			// rework text to fit inside optimal text box.
			_.each(layer, function (node) {

				var content 	= node.data;
				var words 		= content.split(" ");
				var text 	= "";

				_.each(words, function (word) {
						node.textBox.attr("text", text + " " + word);
						if(node.textBox.getBBox().width > maxTextWidth){
							text += "\n" + word;	
						} else {
							text += " " + word;	
						}
				});
				
				node.textBox.attr("text", text.substring(1));

				node.designBox.attr(
					{
						'width': node.textBox.getBBox().width + nodeBuffer*2,
						'height': node.textBox.getBBox().height + nodeBuffer*2
					});

				layer.width += node.textBox.getBBox().width + nodeBuffer*2;
				
				node.width 	= node.designBox.attr("width")+spacingX;
				node.height = node.designBox.attr("height");

				if(node.height > greatestTextHeightInLayer) {
					greatestTextHeightInLayer = node.height;
				}

			});
			_(layer).each( function( node, key) {
			  node.layerHeight = greatestTextHeightInLayer + nodeBuffer*2;
			  node.layerStartY = currentY;
			})

		layer.height 	= greatestTextHeightInLayer + nodeBuffer*2;
		layer.startY 	= currentY;
		currentY 		+= (layer.height + spacingY);
		/**
		 * Bus holds horizontal arrows routing for non tree edges.
		 * Bus is defined as a vertical range where nothing else 
		 * can be drawn.
		 * @type {Object}
		 */
		layer.bus 		= {
			'topY': 	currentY - spacingY,
			'bottomY': 	currentY,
			'addLine': 	function( ) {
				// shifts everything below down
				// add code...
			}
		}
		console.log(layer.bus);

	});


	/**
	 * Creates a width for each node's zone.
	 * 
	 * @param  {object} node
	 * @return {number}	node.zone
	 */
	var initZone = function (node) {
		node.zone = 0;
		_.each(node.adjacent, function (adj) {

			node.zone += initZone(adj);
		});
		if(node.zone < node.width) {
			node.zone = node.width;
		}
		return node.zone;
	}	

	/**
	 * Incase zone space is not all allocated to adjacent nodes 
	 * the space is then distributed evenly between adjacencies.
	 * 
	 * @param  {object} node
	 *
	 */
	var zoneBalancer = function (node) {

		var totalAdjZones = 0;
		//Add up total zone space taken up by adjacencies
		_.each(node.adjacent, function (adj) {
			totalAdjZones += adj.zone;
		});
		//if that space is less than the zone's space,
		if(totalAdjZones < node.zone) {

			var newZoneSize = node.zone / node.adjacent.length;

			//distribute it evenly
			_.each(node.adjacent, function (adj) {
				adj.zone = newZoneSize;
				zoneBalancer(adj);
			});
		}
		else {
			_.each(node.adjacent, function (adj) {
				zoneBalancer(adj);
			});
		}

	}
	//initialize zone's and then balance them
	var createZones = function (node) {
		initZone(node);
		zoneBalancer(node);
	}
	createZones(start);

/////////////// NEED TO MOVE THIS DOWN for BUS
	titleWidth = Tree.title.getBBox().width;
	//Figure out widest element on the screen
	if(start.zone > titleWidth) {
		windowWidth = start.zone;
	}
	else {
		windowWidth = titleWidth;
	}
	windowWidth += 100;

	//resize paper based on widest element
	viewPaper.setSize(windowWidth,currentY);
//////////////

	//$(innerContainer).scrollTo( '50%', {axis: 'x'} );

	var setNodePositions = function (node) {
		if(node.parents.length == 0) {
			node.zoneXpos = windowWidth / 2 - node.zone / 2;
			node.xCurrent = node.zoneXpos;
		}
		else {
			node.zoneXpos = node.parents[0].xCurrent;
			node.parents[0].xCurrent += node.zone;
			node.xCurrent = node.zoneXpos;
		}

		node.setX(node.zoneXpos+node.zone/2);
		node.setY(node.layerStartY);		
		
		if(TESTING2) {
			viewPaper.text(	node.zoneXpos + node.zone / 2 + nodeBuffer
							 - node.designBox.attr('width') / 2, 
				node.layerStartY).attr({'text': node.zoneXpos+', to: '+(node.zoneXpos+node.zone) });
		}

		node.designBox.toBack();

		if(TESTING2) {
			viewPaper.rect(node.zoneXpos + 2,Tree.layers[node.layer].startY,node.zone,node.layerHeight).attr({'stroke': 'red'});;
			viewPaper.rect(node.zoneXpos+node.zone / 2,Tree.layers[node.layer].startY,1,4).attr({'stroke': 'red'});; 
		}
		_.each(node.adjacent, function (adj) {
			setNodePositions(adj);
		});
	}
	setNodePositions(start);



	//draw title
	Tree.title.attr({
		'x': start.zoneXpos + start.zone / 2 - Tree.title.getBBox().width/2, 
		'y': spacingY*3
	});

	var routePaths = function (node) {
		_.each(node.adjacent, function (adj) {
			
			routePaths(adj);

			var pathStartX, pathStartY, pathTurn1X, pathTurn1Y, 
				pathTurn2X, pathTurn2Y, pathEndX, pathEndY;

			//console.log(node.designBox.attr('x'));

			pathStartX 	= node.designBox.attr('x')
				 			+ node.designBox.attr('width') / 2;
			pathStartY 	= node.designBox.attr('y') 
							+ node.designBox.attr('height') / 2;
			pathTurn1X 	= pathStartX;
			pathTurn1Y 	= node.designBox.attr('y') 
							+ node.designBox.attr('height') / 2;
			pathTurn2X 	= adj.designBox.attr('x') 
							+ adj.designBox.attr('width') / 2;
			pathTurn2Y 	= pathTurn1Y;
			pathEndX 	= pathTurn2X;
			pathEndY 	= adj.designBox.attr('y') 
							+ adj.designBox.attr('height') / 2;
			
			var pathString = 'M'+pathStartX+','+pathStartY+'L'+pathTurn1X
								+','+pathTurn1Y+'L'+pathTurn2X+','+pathTurn2Y
								+'L'+pathEndX+','+pathEndY;
			
			var newPath = viewPaper.path(pathString)
							.attr({'stroke': '#999'}).toBack();
			
			newPath.child = adj;
			node.paths.push(newPath);
		});

	}
	routePaths(start);
	//Add each back edge. do not put in loop
	//change this to use bus'
	_.each(arrows, function (arrow) {
		if(arrow.used == 0) {
			var fromNode = Tree.getNode(arrow.from);
			var toNode = Tree.getNode(arrow.to);

			var pathStartX, pathStartY, pathTurn1X, pathTurn1Y, 
				pathTurn2X, pathTurn2Y, pathEndX, pathEndY;

			//starts center of from node
			pathStartX 	= fromNode.designBox.attr('x') 
							+ fromNode.designBox.attr('width') / 2;
			pathStartY 	= fromNode.designBox.attr('y'); 
							+ fromNode.designBox.attr('height') / 2;

			// extends to center of bus zone below of above depending
			// on orientation of toNode relative to fromNode
			pathTurn1X 	= pathStartX;
			pathTurn1Y 	= fromNode.designBox.attr('y');
			toNode.layer > fromNode.layer ? 
				pathTurn1Y += fromNode.layerStartY + fromNode.layerHeight 
								+ nodeBuffer / 2: 
				pathTurn1Y -= fromNode.designBox.attr('height') / 2 
								- nodeBuffer / 2;

			//check if fromNode's parent 
			pathTurn2X 	= toNode.designBox.attr('x') 
							+ toNode.designBox.attr('width') / 2;
			pathTurn2Y 	= pathTurn1Y;
			pathEndX 	= pathTurn2X;
			pathEndY 	= toNode.designBox.attr('y') 
							+ toNode.designBox.attr('height') / 2;

			var pathString = 'M'+pathStartX+','+pathStartY+'L'+pathTurn1X
								+','+pathTurn1Y+'L'+pathTurn2X+','+pathTurn2Y
								+'L'+pathEndX+','+pathEndY;

			var newPath = viewPaper.path(pathString)
							.attr({'stroke': '#999'}).toBack();

			newPath.child = toNode;

			//add from node as parent since it was not counting in the dfs
			toNode.parents.push(fromNode);
			fromNode.paths.push(newPath);
		}
	});

	_.each(Tree.nodes, function (node) {
		//set background

		if(!TESTING) {
		//initialize glow variables so remove works
		_.each(Tree.nodes, function (node) {

			node.g = node.designBox.glow({'width': 10, 'opacity': .5});
			node.g.remove();
			node.c = node.designBox.glow({'width': 10, 'opacity': .5});
			node.c.remove();

			_.each(node.paths, function (path) {

				path.g = path.glow({'width': 10, 'opacity': .5});
				path.g.remove();
				path.c = path.glow({'width': 10, 'opacity': .5});
				path.c.remove();
			});
		});
		node.designBox.hover(
			function () {
				node.g.remove();
				node.g = node.designBox.glow({'width': 10, 'opacity': .5});

				var rec = function (currNode,prevNode) {
					
					if(currNode != -1) {
						currNode.g.remove();
						currNode.g = currNode.designBox.glow({'width': 10, 'opacity': .5});

						_.each(currNode.paths, function (path) {
							if(path.child === prevNode) {
								path.g.remove();
								path.g = path.glow({'width': 10, 'opacity': .5});
							}
						});

						_.each(currNode.parents, function (parent) {
							rec(parent,currNode);
						});
					}

				}
				_.each(node.parents, function (parent) {
					rec(parent,node);
				});
			},
			function () {

				node.g.remove();

				var rec = function (currNode,prevNode) {
					
					if(currNode != -1) {
						
						currNode.g.remove();

						_.each(currNode.paths, function (path) {
							if(path.child === prevNode) {

								path.g.remove();

							}
						});

						_.each(currNode.parents, function (parent) {
							rec(parent,currNode);
						});
					}

				}
				_.each(node.parents, function (parent) {
					rec(parent,node);
				});
			}
		);
		node.textBox.hover(
			function () {
				node.g.remove();
				node.g = node.designBox.glow({'width': 10, 'opacity': .5});

				var rec = function (currNode,prevNode) {
					
					if(currNode != -1) {
						currNode.g.remove();
						currNode.g = currNode.designBox.glow({'width': 10, 'opacity': .5});

						_.each(currNode.paths, function (path) {
							if(path.child === prevNode) {
								path.g.remove();
								path.g = path.glow({'width': 10, 'opacity': .5});
							}
						});

						_.each(currNode.parents, function (parent) {
							rec(parent,currNode);
						});
					}

				}
				_.each(node.parents, function (parent) {
					rec(parent,node);
				});
			},
			function () {

				node.g.remove();

				var rec = function (currNode,prevNode) {
					
					if(currNode != -1) {
						
						currNode.g.remove();

						_.each(currNode.paths, function (path) {
							if(path.child === prevNode) {

								path.g.remove();

							}
						});

						_.each(currNode.parents, function (parent) {
							rec(parent,currNode);
						});
					}

				}
				_.each(node.parents, function (parent) {
					rec(parent,node);
				});
			}
		);
		node.designBox.click(
			function () {

				//FIRST RUN DOWNWARD REC FUNCTION THAT REMOVES ALL GLOW
				var recRemove = function (currNode) {
					currNode.c.remove();
						_.each(currNode.paths, function (path) {
								path.c.remove();
								recRemove(path.child);
						});			
				}
				recRemove(start);
				////////////

				node.c.remove();
				node.c = node.designBox.glow({'width': 10, 'opacity': .5});

				var rec = function (currNode,prevNode) {
					
					if(currNode != -1) {
						currNode.c.remove();
						currNode.c = currNode.designBox.glow({'width': 10, 'opacity': .5});

						_.each(currNode.paths, function (path) {
							if(path.child === prevNode) {
								path.c.remove();
								path.c = path.glow({'width': 10, 'opacity': .5});
							}
						});

						_.each(currNode.parents, function (parent) {
							rec(parent,currNode);
						});
					}

				}
				_.each(node.parents, function (parent) {
					rec(parent,node);
				});
			}
		);
		node.textBox.click(
			function () {

				//FIRST RUN DOWNWARD REC FUNCTION THAT REMOVES ALL GLOW
				var recRemove = function (currNode) {
					currNode.c.remove();
						_.each(currNode.paths, function (path) {
								path.c.remove();
								recRemove(path.child);
						});			
				}
				recRemove(start);
				////////////

				node.c.remove();
				node.c = node.designBox.glow({'width': 10, 'opacity': .5});

				var rec = function (currNode,prevNode) {
					
					if(currNode != -1) {
						currNode.c.remove();
						currNode.c = currNode.designBox.glow({'width': 10, 'opacity': .5});

						_.each(currNode.paths, function (path) {
							if(path.child === prevNode) {
								path.c.remove();
								path.c = path.glow({'width': 10, 'opacity': .5});
							}
						});

						_.each(currNode.parents, function (parent) {
							rec(parent,currNode);
						});
					}

				}
				_.each(node.parents, function (parent) {
					rec(parent,node);
				});
			}
		);
		}
	});
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

treeMain(chart,document.getElementById('container'));

});