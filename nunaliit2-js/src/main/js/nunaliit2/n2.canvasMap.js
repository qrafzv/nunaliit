/*
Copyright (c) 2018, Geomatics and Cartographic Research Centre, Carleton 
University
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

 - Redistributions of source code must retain the above copyright notice, 
   this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
 - Neither the name of the Geomatics and Cartographic Research Centre, 
   Carleton University nor the names of its contributors may be used to 
   endorse or promote products derived from this software without specific 
   prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
POSSIBILITY OF SUCH DAMAGE.

*/

;(function($,$n2) {
"use strict";

var 
 _loc = function(str,args){ return $n2.loc(str,'nunaliit2',args); }
 ,DH = 'n2.canvasMap'
 ;

// --------------------------------------------------------------------------
/* 
This canvas displays a map based on OpenLayers5.  

*/
var MapCanvas = $n2.Class('MapCanvas',{

	canvasId: null,

	sourceModelId: null,
	
	elementGenerator: null,

	dispatchService: null,

	showService: null,

	initialize: function(opts_){
		var opts = $n2.extend({
			canvasId: undefined
			,sourceModelId: undefined
			,elementGenerator: undefined
			,config: undefined
			,onSuccess: function(){}
			,onError: function(err){}
		},opts_);

		var _this = this;
		
		try {
			this.canvasId = opts.canvasId;
			this.sourceModelId = opts.sourceModelId;
			this.elementGenerator = opts.elementGenerator;
	
			var config = opts.config;
			if( config ){
				if( config.directory ){
					this.dispatchService = config.directory.dispatchService;
					this.showService = config.directory.showService;
				};
			};
		
			// Element generator
			if( this.elementGenerator ){
				this.elementGenerator.setElementsChangedListener(function(added, updated, removed){
					_this._elementsChanged(added, updated, removed);
				});
				this.elementGenerator.setIntentChangedListener(function(updated){
					_this._intentChanged(updated);
				});
			};
	
			// Register to events
			if( this.dispatchService ){
				var f = function(m){
					_this._handleDispatch(m);
				};
				
				this.dispatchService.register(DH,'modelGetInfo',f);
				this.dispatchService.register(DH,'modelStateUpdated',f);
			};
			
			$n2.log(this._classname,this);
			
			this._drawMap();
			
		} catch(err) {
			var error = new Error('Unable to create '+this._classname+': '+err);
			opts.onError(error);
		};
		
		opts.onSuccess();
	}
	,_elementsChanged: function(added, updated, removed){
		
		$n2.log("inside elementsChanged", arguments);
	}
	
	,_intentChanged: function(updated){
		
		$n2.log('inside intentChanged');
		
	}
	
	,_getElem: function(){
		var $elem = $('#'+this.canvasId);
		if( $elem.length < 1 ){
			return undefined;
		};
		return $elem;
	},

	
	_drawMap: function() {
		 var image = new ol.style.Circle({
		        radius: 5,
		        fill: null,
		        stroke: new ol.style.Stroke({color: 'red', width: 1})
		      });

		      var styles = {
		        'Point': new ol.style.Style({
		          image: image
		        }),
		        'LineString': new ol.style.Style({
		          stroke: new ol.style.Stroke({
		            color: 'green',
		            width: 1
		          })
		        }),
		        'MultiLineString': new ol.style.Style({
		          stroke: new ol.style.Stroke({
		            color: 'green',
		            width: 1
		          })
		        }),
		        'MultiPoint': new ol.style.Style({
		          image: image
		        }),
		        'MultiPolygon': new ol.style.Style({
		          stroke: new ol.style.Stroke({
		            color: 'yellow',
		            width: 1
		          }),
		          fill: new ol.style.Fill({
		            color: 'rgba(255, 255, 0, 0.1)'
		          })
		        }),
		        'Polygon': new ol.style.Style({
		          stroke: new ol.style.Stroke({
		            color: 'blue',
		            lineDash: [4],
		            width: 3
		          }),
		          fill: new ol.style.Fill({
		            color: 'rgba(0, 0, 255, 0.1)'
		          })
		        }),
		        'GeometryCollection': new ol.style.Style({
		          stroke: new ol.style.Stroke({
		            color: 'magenta',
		            width: 2
		          }),
		          fill: new ol.style.Fill({
		            color: 'magenta'
		          }),
		          image: new ol.style.Circle({
		            radius: 10,
		            fill: null,
		            stroke: new ol.style.Stroke({
		              color: 'magenta'
		            })
		          })
		        }),
		        'Circle': new ol.style.Style({
		          stroke: new ol.style.Stroke({
		            color: 'red',
		            width: 2
		          }),
		          fill: new ol.style.Fill({
		            color: 'rgba(255,0,0,0.2)'
		          })
		        })
		      };

		      var styleFunction = function(feature) {
		        return styles[feature.getGeometry().getType()];
		      };
		var geojsonObject = {
		        'type': 'FeatureCollection',
		        'crs': {
		          'type': 'name',
		          'properties': {
		            'name': 'EPSG:3857'
		          }
		        },
		        'features': [{
		          'type': 'Feature',
		          'geometry': {
		            'type': 'Point',
		            'coordinates': [0, 0]
		          }
		        }, {
		          'type': 'Feature',
		          'geometry': {
		            'type': 'LineString',
		            'coordinates': [[4e6, -2e6], [8e6, 2e6]]
		          }
		        }, {
		          'type': 'Feature',
		          'geometry': {
		            'type': 'LineString',
		            'coordinates': [[4e6, 2e6], [8e6, -2e6]]
		          }
		        }, {
		          'type': 'Feature',
		          'geometry': {
		            'type': 'Polygon',
		            'coordinates': [[[-5e6, -1e6], [-4e6, 1e6], [-3e6, -1e6]]]
		          }
		        }, {
		          'type': 'Feature',
		          'geometry': {
		            'type': 'MultiLineString',
		            'coordinates': [
		              [[-1e6, -7.5e5], [-1e6, 7.5e5]],
		              [[1e6, -7.5e5], [1e6, 7.5e5]],
		              [[-7.5e5, -1e6], [7.5e5, -1e6]],
		              [[-7.5e5, 1e6], [7.5e5, 1e6]]
		            ]
		          }
		        }, {
		          'type': 'Feature',
		          'geometry': {
		            'type': 'MultiPolygon',
		            'coordinates': [
		              [[[-5e6, 6e6], [-5e6, 8e6], [-3e6, 8e6], [-3e6, 6e6]]],
		              [[[-2e6, 6e6], [-2e6, 8e6], [0, 8e6], [0, 6e6]]],
		              [[[1e6, 6e6], [1e6, 8e6], [3e6, 8e6], [3e6, 6e6]]]
		            ]
		          }
		        }, {
		          'type': 'Feature',
		          'geometry': {
		            'type': 'GeometryCollection',
		            'geometries': [{
		              'type': 'LineString',
		              'coordinates': [[-5e6, -5e6], [0, -5e6]]
		            }, {
		              'type': 'Point',
		              'coordinates': [4e6, -5e6]
		            }, {
		              'type': 'Polygon',
		              'coordinates': [[[1e6, -6e6], [2e6, -4e6], [3e6, -6e6]]]
		            }]
		          }
		        }]
		      };
		var customMap = new ol.N2Map({
			target : this.canvasId,
			layers: [
				new ol.layer.Group({
					'title': 'Base maps',
					layers: [
						new ol.layer.Group({
							title: 'Water color with labels',
							type: 'base',
							combine: true,
							visible: false,
							layers: [
								new ol.layer.Tile({
									source: new ol.source.Stamen({
										layer: 'watercolor'
									})
								}),
								new ol.layer.Tile({
									source: new ol.source.Stamen({
										layer: 'terrain-labels'
									})
								})
								]
						}),
						new ol.layer.Tile({
							title: 'Water color',
							type: 'base',
							visible: false,
							source: new ol.source.Stamen({
								layer: 'watercolor'
							})
						}),
						new ol.layer.Tile({
							title: 'OSM',
							type: 'base',
							visible: true,
							source: new ol.source.OSM()
						})
						]
				}),
				new ol.layer.Group({
					title: 'Overlays',
					layers: [
						new ol.layer.Image({
							title: 'Countries',
							source: new ol.source.ImageArcGISRest({
								ratio: 1,
								params: {'LAYERS': 'show:0'},
								url: "https://ons-inspire.esriuk.com/arcgis/rest/services/Administrative_Boundaries/Countries_December_2016_Boundaries/MapServer"
							})
						}),
						new ol.layer.Vector({
							source: new couchDbSource({
								features: (new ol.format.GeoJSON()).readFeatures(geojsonObject)
								
							}),
							style: styleFunction
						})
						]
				})
				],
				view: new ol.View({
					center: ol.proj.transform([-0.92, 52.96], 'EPSG:4326', 'EPSG:3857'),
					zoom: 6
				})
		});


		var customLayerSwitcher = new ol.control.NunaliitLayerSwitcher({
			tipLabel: 'Légende' // Optional label for button
		});
		customMap.addControl(customLayerSwitcher);
		customMap.getInfo();
	},

	_handleDispatch: function(m, addr, dispatcher){
		if('modelStateUpdated' === m.type) {
			if( this.sourceModelId === m.modelId ){
				if(m.state){
					this.elementGenerator.sourceModelUpdated(m.state);
				}
			};
		}
	}
});
 
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------

var couchDbSource = $n2.Construct(ol.source.Vector,{
	
	constructor: function(opts_){
		couchDbSource.base(this, 'constructor', opts_);
	}
	
	
})


//--------------------------------------------------------------------------
function HandleCanvasAvailableRequest(m){
	if( m.canvasType === 'map' ){
		m.isAvailable = true;
	};
};

//--------------------------------------------------------------------------
function HandleCanvasDisplayRequest(m){
	if( m.canvasType === 'map' ){
		
		var options = {};
		if( m.canvasOptions ){
			for(var key in m.canvasOptions){
				options[key] = m.canvasOptions[key];
			};
		};
		
 		if( !options.elementGenerator ){
 			// If not defined, use the one specified by type
 			options.elementGenerator = $n2.canvasElementGenerator.CreateElementGenerator({
 	 			type: options.elementGeneratorType
 	 			,options: options.elementGeneratorOptions
 	 			,config: m.config
 	 		});
 		};
 		
		options.canvasId = m.canvasId;
		options.config = m.config;
		options.onSuccess = m.onSuccess;
		options.onError = m.onError;
		
		new MapCanvas(options);
	};
};

//--------------------------------------------------------------------------
$n2.canvasMap = {
	MapCanvas: MapCanvas
	,HandleCanvasAvailableRequest: HandleCanvasAvailableRequest
	,HandleCanvasDisplayRequest: HandleCanvasDisplayRequest
};

})(jQuery,nunaliit2);
