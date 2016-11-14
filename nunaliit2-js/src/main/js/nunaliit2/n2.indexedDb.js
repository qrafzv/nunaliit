;(function($n2){
"use strict";

var _loc = function(str,args){ return $n2.loc(str,'nunaliit2-couch',args); }
,DH = 'n2.indexedDb';

// ===================================================
var DB_STORE_DOCS = 'docs';
var DB_STORE_INFO = 'info';
var DocumentCache = $n2.Class({

	db: null,

	dbName: null,
	
	dispatchService: null,

	id: null,
	
	changes: null,
	
	changesByDocId: null,

	initialize: function(opts_){
		var opts = $n2.extend({
			db: null
			,dbName: null // not likely known at time of creation
			,dispatchService: null
		},opts_);
		
		this.db = opts.db;
		this.dbName = opts.dbName;
		this.dispatchService = opts.dispatchService;

		this.id = $n2.getUniqueId();
		this.changes = null;
		this.changesByDocId = {};
	},

	/**
	 * Initialize or re-initialize the cache to the given update
	 * sequence number.
	 */
	initializeCache: function(opts_){
		var opts = $n2.extend({
			updateSequence: null
			,onSuccess: function(){}
			,onError: function(err){}
		},opts_);
		
		var _this = this;
		
		var updateSequence = opts.updateSequence;
		if( typeof updateSequence !== 'number' ){
			throw new Error('When initializing document cache, update sequence must be a number');
		};
		
		this.clearCache({
			onSuccess: function(){
				_this._setUpdateSequence({
					updateSequence: updateSequence
					,onSuccess: function(){
						this.changes = null;
						this.changesByDocId = {};
						opts.onSuccess();
					}
					,onError: function(err){
						$n2.log('Error while recording initial sequence number. '+err);
						opts.onError(err);
					}
				});
			}
			,onError: function(err){
				$n2.log('Error while clearing document store. '+err);
				opts.onError(err);
			}
		});
	},
	
	getUpdateSequence: function(opts_){
		var opts = $n2.extend({
			onSuccess: function(updateSequence){}
			,onError: function(err){}
		},opts_);

		var db = this.db;
		
		// Check changes
		var updateSequence;
		if( this.changes ){
			this.changes.forEach(function(change){
				if( change && change.updateSequence ){
					updateSequence = change.updateSequence;
				};
			});
		};

		if( updateSequence ){
			opts.onSuccess(updateSequence);
		} else {
			var transaction = db.transaction(DB_STORE_INFO, 'readonly');
		    var store = transaction.objectStore(DB_STORE_INFO);
		    var req = store.get('sequenceNumber');
		    req.onsuccess = function (evt) {
		    	var value = this.result;
		    	if( typeof value === 'object' 
		    	 && typeof value.updateSequence === 'number' ){
					opts.onSuccess(value.updateSequence);
		    	} else if( typeof value === 'undefined' ){
		    		opts.onSuccess(undefined);
		    	} else {
		    		var err = $n2.error.fromString('Invalid format for indexedDb sequence number');
					opts.onError(err);
		    	};
			};
			req.onerror = function(evt) {
				opts.onError(this.error);
			};
		};
	},
	
	performChanges: function(changes){

		var _this = this;
		var db = this.db;
		
		var mustStartThread = true;
		if( this.changes ){
			mustStartThread = false;
		} else {
			this.changes  = [];
			this.changesByDocId = {};
		};
		
		// Add changes to list of current changes
		changes.forEach(function(change){
			// Check change structure
			if( typeof change !== 'object' ){
				throw new Error('A cache change must be an object');
			};
			if( typeof change.updateSequence === 'number' ){
				// OK

			} else if( typeof change.id === 'string' ){
				// This is a document change
				if( typeof change.rev !== 'string' ){
					throw new Error('A document cache change must have a string "rev" attribute');
				};

				if( change.doc === undefined ){
					// OK
				} else if( typeof change.doc !== 'object' ){
					throw new Error('A document cache change must have an object "doc" attribute, if specified');
				} else {
					if( change.doc._id !== change.id ){
						throw new Error('A document cache change that includes a document must match doc._id and change.id');
					};
					if( change.doc._rev !== change.rev ){
						throw new Error('A document cache change that includes a document must match doc._rev and change.rev');
					};
				};

				if( change.deleted === undefined ){
					// OK
				} else if( typeof change.deleted !== 'boolean' ){
					throw new Error('A document cache change must have a boolean "deleted" attribute, if specified');
				};

			} else {
				$n2.log('Invalid cache change',change);
				throw new Error('Unrecognized cache change');
			};
			
			_this.changes.push(change);
			
			if( change.id ){
				// This is a change to a document. Store the latest
				// change for this document
				var latest = _this.changesByDocId[change.id];
				if( latest ){
					// There is a change already scheduled for this document.
					// Keep the latest
					var latestNumber = _this._getNumberFromRevision(latest.rev);
					var changeNumber = _this._getNumberFromRevision(change.rev);
					if( changeNumber > latestNumber ){
						_this.changesByDocId[change.id] = change;
					};
				} else {
					// There is currently no change associated with this document.
					// Accept this one
					_this.changesByDocId[change.id] = change;
				};
			};
		});

//$n2.log('Add '+changes.length+' changes. Total:'+this.changes.length);


		if( mustStartThread ){
//$n2.log('Start thread');
			applyChange();
		};
		
		function applyChange(){
			if( _this.dispatchService ){
				_this.dispatchService.send(DH,{
					type: 'waitReport'
					,requester: _this.id
					,name: 'cacheDocuments'
					,label: _loc('Caching documents')
					,count: _this.changes.length
				});
			};
			
			
			if( _this.changes.length <= 0 ){
				// Done applying all changes. Set changes to null to indicate
				// that thread is terminated
				_this.changes = null;
//$n2.log('Stop thread');
			} else {
				var change = _this.changes.shift();
//$n2.log('Apply changes '+_this.changes.length,change);
				
				if( change.updateSequence ){
					_this._setUpdateSequence({
						updateSequence: change.updateSequence
						,onSuccess: applyChange
						,onError: applyChange
					});
				} else if( change.id ) {
					// This is a change related to a document. Apply the
					// change only if it is the latest one
					var latestChange = _this.changesByDocId[change.id];
					if( change === latestChange ){
						// This is the latest change. Apply
						delete _this.changesByDocId[change.id];

						// Get entry from cache
						_this._getCacheEntry({
							docId: change.id
							,onSuccess: function(cacheEntry){
								if( cacheEntry ){
									// There is an entry in the cache. Figure out which one
									// to store
									var cacheNumber = _this._getNumberFromRevision(cacheEntry.rev);
									var changeNumber = _this._getNumberFromRevision(change.rev);
									if( cacheNumber > changeNumber ){
										// Cache is more recent. Do nothing
										applyChange();
									} else if( cacheNumber < changeNumber ){
										// Cache is older than change. Save the change
										_this._storeCacheEntry({
											cacheEntry: change
											,onSuccess: applyChange
											,onError: applyChange
										});
									} else {
										// At this point, the cache and the change are at the same
										// level. If the cache does not have a document, store it
										// if available
										if( change.doc && !cacheEntry.doc ){
											_this._storeCacheEntry({
												cacheEntry: change
												,onSuccess: applyChange
												,onError: applyChange
											});
										} else {
											// Nothing to do
											applyChange();
										};
									};
								} else {
									// There is no entry in the cache. Store this one.
									_this._storeCacheEntry({
										cacheEntry: change
										,onSuccess: applyChange
										,onError: applyChange
									});
								};
							}
						});
						
					} else {
						// This is not the latest change. Do not apply.
						applyChange();
					};
				} else {
					$n2.log('Unrecognized change to document cache',change);
					applyChange();
				};
			};
		};
	},
	
	getDocument: function(opts_){
		var opts = $n2.extend({
			docId: null
			,onSuccess: function(doc){}
			,onError: function(err){}
		},opts_);

		var _this = this;

		var docId = opts.docId;
		if( typeof docId !== 'string' ){
			throw new Error('DocumentCache.getDocument must have docId specified as an attribute');
		};
		
		// Check pending changes for this document
		var pendingChange;
		if( this.changesByDocId 
		 && this.changesByDocId[docId] ){
			pendingChange = this.changesByDocId[docId];
		};
		
		this._getCacheEntry({
			docId: docId
			,onSuccess: function(cacheEntry){
		    	if( cacheEntry && pendingChange ){
		    		// We have to figure which entry we want to use, the one
		    		// in memory (pending) or the one from the cache
					var cacheNumber = _this._getNumberFromRevision(cacheEntry.rev);
					var pendingNumber = _this._getNumberFromRevision(pendingChange.rev);
					if( cacheNumber > pendingNumber ){
						// Cache is more recent. Keep cache

					} else if( cacheNumber < pendingNumber ){
						// Cache is older than pending change. Use pending change.
						cacheEntry = pendingChange;

					} else {
						// At this point, the cache and the change are at the same
						// level. Use the one that offers a document
						if( pendingChange.doc ){
							cacheEntry = pendingChange;
						};
					};
		    	};

		    	if( !cacheEntry ){
		    		// Not in cache
					opts.onSuccess(undefined);
		    	} else  if( cacheEntry.doc ){
					opts.onSuccess(cacheEntry.doc);
		    	} else {
		    		// In cache, but no document
					opts.onSuccess(undefined);
		    	};
			}
			,onError: opts.onError
		});
	},
	
	getDocuments: function(opts_){
		var opts = $n2.extend({
			docIds: null
			,onSuccess: function(docs){}
			,onError: function(err){}
		},opts_);

		var _this = this;
		
	    var docs = [];
	    var docIds = opts.docIds.slice(); // clone
	    var index = 0;
	    fetch();
	    
	    function fetch(){
	    	if( index >= docIds.length ){
	    		opts.onSuccess(docs);
	    	} else {
	    		var docId = docIds[index];
	    		++index;

	    		_this.getDocument({
    				docId: docId
    				,onSuccess: function(doc){
		    	    	if( doc ){
			    			docs.push(doc);
		    	    	};
		    	    	fetch();
    				}
    				,onError: fetch
	    		});
	    	};
	    };
	},
	
	updateDocument: function(doc){
		this.updateDocuments([doc]);
	},
	
	updateDocuments: function(docs){
		var _this = this;

		var changes = [];
		docs.forEach(function(doc){
			changes.push({
				id: doc._id
				,rev: doc._rev
				,doc: doc
			});
		});
		
		this.performChanges(changes);
	},
	
	clearCache: function(opts_){
		var opts = $n2.extend({
			onSuccess: function(){}
			,onError: function(err){}
		},opts_);

		var _this = this;

		this._clearDocumentStore({
			onSuccess: function(){
				_this._clearInfoStore({
					onSuccess: opts.onSuccess
					,onError: opts.onError
				});
			}
			,onError: opts.onError
		});
	},
	
	_clearDocumentStore: function(opts_){
		var opts = $n2.extend({
			onSuccess: function(){}
			,onError: function(err){}
		},opts_);
		
		var db = this.db;
		
		var transaction = db.transaction(DB_STORE_DOCS, 'readwrite');
	    var store = transaction.objectStore(DB_STORE_DOCS);
	    var req = store.clear();
	    req.onsuccess = opts.onSuccess;
		req.onerror = function(evt){
			var error = this.error;
			$n2.log('Unable to clear indexedDb document store',error);
			opts.onError(error);
		};
		
	},
	
	_clearInfoStore: function(opts_){
		var opts = $n2.extend({
			onSuccess: function(){}
			,onError: function(err){}
		},opts_);
		
		var db = this.db;
		
		var transaction = db.transaction(DB_STORE_INFO, 'readwrite');
	    var store = transaction.objectStore(DB_STORE_INFO);
	    var req = store.clear();
	    req.onsuccess = opts.onSuccess;
		req.onerror = function(evt){
			var error = this.error;
			$n2.log('Unable to clear indexedDb info store',error);
			opts.onError(error);
		};
		
	},
	
	_storeCacheEntry: function(opts_){
		var opts = $n2.extend({
			cacheEntry: null
			,onSuccess: function(){}
			,onError: function(err){}
		},opts_);

		var db = this.db;
		var cacheEntry = opts.cacheEntry;

		var transaction = this.db.transaction(DB_STORE_DOCS, 'readwrite');
	    var store = transaction.objectStore(DB_STORE_DOCS);
	    var req = store.put(cacheEntry);
	    req.onsuccess = function (evt) {
			opts.onSuccess();
		};
		req.onerror = function() {
			opts.onError(this.error);
		};
	},
	
	_getCacheEntry: function(opts_){
		var opts = $n2.extend({
			docId: null
			,onSuccess: function(doc){}
			,onError: function(err){}
		},opts_);

		var _this = this;

		var db = this.db;
		var docId = opts.docId;
		
		var transaction = db.transaction(DB_STORE_DOCS, 'readonly');
	    var store = transaction.objectStore(DB_STORE_DOCS);
	    var req = store.get(docId);
	    req.onsuccess = function (evt) {
	    	var cacheEntry = this.result;
			opts.onSuccess(cacheEntry);
		};
		req.onerror = function(evt) {
			opts.onError(this.error);
		};
	},
	
	_setUpdateSequence: function(opts_){
		var opts = $n2.extend({
			updateSequence: null
			,onSuccess: function(){}
			,onError: function(err){}
		},opts_);

		var db = this.db;
		
		if( typeof opts.updateSequence !== 'number' ){
			throw new Error('updateSequence must be a number');
		};

		var transaction = db.transaction(DB_STORE_INFO, 'readwrite');
	    var store = transaction.objectStore(DB_STORE_INFO);
	    var req = store.put({
	    	_id: 'sequenceNumber'
	    	,updateSequence: opts.updateSequence
	    });
	    req.onsuccess = opts.onSuccess;
		req.onerror = function(evt) {
			opts.onError(this.error);
		};
	},
	
	_getNumberFromRevision: function(revision){
		var splits = revision.split('-');
		var number = 1 * splits[0];
		return number;
	}
});

//===================================================
var IndexedDbConnection = $n2.Class({

	db: null,

	initialize: function(opts_){
		var opts = $n2.extend({
			db: null
		},opts_);
		
		this.db = opts.db;
	},

	getDocumentCache: function(opts_){
		var opts = $n2.extend({},opts_);
		
		opts.db = this.db;
		
		var docDb = new DocumentCache(opts);
		
		return docDb;
	}
});

//===================================================
var DB_NAME = 'nunaliit';
var DB_VERSION = 4;
function openIndexedDb(opts_){
	var opts = $n2.extend({
		onSuccess: function(indexedDbConnection){}
		,onError: function(err){}
	},opts_);

	var req = indexedDB.open(DB_NAME, DB_VERSION);
	req.onsuccess = function (evt) {
		// Better use "this" than "req" to get the result to avoid problems with
		// garbage collection.
		// db = req.result;
		var db = this.result;
		
		var n2IndexDb = new IndexedDbConnection({
			db: db
		});

		opts.onSuccess(n2IndexDb);
	};

	req.onerror = function (evt) {
		$n2.log("openDb:", evt.target.errorCode);
		opts.onError(this.error);
	};
	
	req.onupgradeneeded = function (evt) {
		
		var db = this.result;
		var oldVersion = undefined;
		var newVersion = undefined;
		if( evt && evt.currentTarget ){
			newVersion = evt.newVersion;
			oldVersion = evt.oldVersion;
		};

		$n2.log('Upgrading indexDB '+DB_NAME+' from: '+oldVersion+' to: '+newVersion);

		if( oldVersion < 1 ){ // docs store has existed since version 1
			db.createObjectStore(
				DB_STORE_DOCS
				,{ 
					keyPath: 'id' 
				}
			);
		} else if( oldVersion < 4 ){ // change in structure since version 4
			db.deleteObjectStore(DB_STORE_DOCS);
			db.createObjectStore(
				DB_STORE_DOCS
				,{ 
					keyPath: 'id' 
				}
			);
		};
		
		if( oldVersion < 2 ){ // info store has existed since version 1
			db.createObjectStore(
				DB_STORE_INFO
				,{ 
					keyPath: '_id' 
				}
			);
		};
	};
};
	
//===================================================
$n2.indexedDb = {
	openIndexedDb: openIndexedDb
};
	
})(nunaliit2);