/*globals Backbone:true, _:true, jQuery:true*/
Backbone.Paginator = (function ( Backbone, _, $ ) {
	"use strict";

	var Paginator = {};
	Paginator.version = "0.15";

	// @name: clientPager
	//
	// @tagline: Paginator for client-side data
	//
	// @description:
	// This paginator is responsible for providing pagination
	// and sort capabilities for a single payload of data
	// we wish to paginate by the UI for easier browsering.
	//
	Paginator.clientPager = Backbone.Collection.extend({
	
		// Default values used when sorting and/or filtering.
		sortColumn: "",
		sortDirection: "desc",
		filterFields: "",
		filterExpression: "",

		sync: function ( method, model, options ) {

			var queryMap = {};
				queryMap[this.perPageAttribute] =  this.perPage;
				queryMap[this.skipAttribute] = this.page * this.perPage;
				queryMap[this.orderAttribute] =  this.sortField;
				queryMap[this.customAttribute1] =  this.customParam1;
				queryMap[this.formatAttribute] =  this.format;
				queryMap[this.customAttribute2] = this.customParam2;
				queryMap[this.queryAttribute] =  this.query; 

			var params = _.extend({
				type: 'GET',
				dataType: 'jsonp',
				jsonpCallback: 'callback',
				data: decodeURIComponent($.param(queryMap)),
				url: _.result(this, 'url'),
				processData: false
			}, options);

			return $.ajax(params);
		},

		nextPage: function () {
			this.page = ++this.page;
			this.pager();
		},

		previousPage: function () {
			this.page = --this.page || 1;
			this.pager();
		},

		goTo: function ( page ) {
			if(page !== undefined){
				this.page = parseInt(page, 10);
				this.pager();
			}
		},

		howManyPer: function ( perPage ) {
			if(perPage !== undefined){
				this.displayPerPage = parseInt(perPage, 10);
				this.page = 1;
				this.pager();
			}
		},


		// setSort is used to sort the current model. After
		// passing 'column', which is the model's field you want
		// to filter and 'direction', which is the direction
		// desired for the ordering ('asc' or 'desc'), pager()
		// and info() will be called automatically.
		setSort: function ( column, direction ) {
			if(column !== undefined && direction !== undefined){
				this.sortColumn = column;
				this.sortDirection = direction;
				this.pager();
				this.info();
			}
		},
		
		// setFilter is used to filter the current model. After
		// passing 'fields', which can be a string referring to
		// the model's field or an array of strings representing
		// all of the model's fields you wish to filter by and
		// 'filter', which is the word or words you wish to 
		// filter by, pager() and info() will be called automatically.
		setFilter: function ( fields, filter ) {
			if( fields !== undefined && filter !== undefined ){
				this.filterFields = fields;
				this.filterExpression = filter;
				this.pager();
				this.info();
			}
		},

		// pager is used to sort, filter and show the data 
		// you expect the library to display.
		pager: function () {
			var self = this,
				disp = this.displayPerPage,
				start = (self.page - 1) * disp,
				stop = start + disp;

			// Saving the original models collection is important
			// as we could need to sort or filter, and we don't want
			// to loose the data we fetched from the server.
			if (self.origModels === undefined) {
				self.origModels = self.models;
			}

			self.models = self.origModels;

			// Check if sorting was set using setSort.
			if ( this.sortColumn !== "" ) {
				self.models = self._sort(self.models, this.sortColumn, this.sortDirection);
			}
			
			// Check if filtering was set using setFilter.
			if ( this.filterExpression !== "" ) {
				self.models = self._filter(self.models, this.filterFields, this.filterExpression);
			}
			
			// We need to save the sorted and filtered models collection
			// because we'll use that sorted and filtered collection in info().
			self.sortedAndFilteredModels = self.models;
			
			self.reset(self.models.slice(start, stop));
		},

		// The actual place where the collection is sorted.
		// Check setSort for arguments explicacion.
		_sort: function ( models, sort, direction ) {
			models = models.sort(function (a, b) {
				var ac = a.get(sort),
					bc = b.get(sort);
				
				if ( !ac || !bc ) {
					return 0;
				} else {
					/* Make sure that both ac and bc are lowercase strings.
					* .toString() first so we don't have to worry if ac or bc
					* have other String-only methods.
					*/
					ac = ac.toString().toLowerCase();
					bc = bc.toString().toLowerCase();
				}
				
				if (direction === 'desc') {

					// We need to know if there aren't any non-number characters
					// and that there are numbers-only characters and maybe a dot
					// if we have a float.
					if((!ac.match(/[^\d\.]/) && ac.match(/[\d\.]*/)) && 
						(!bc.match(/[^\d\.]/) && bc.match(/[\d\.]*/))
					){
					
						if( (ac - 0) < (bc - 0) ) {
							return 1;
						}
						if( (ac - 0) > (bc - 0) ) {
							return -1;
						}
					} else {
						if (ac < bc) {
							return 1;
						}
						if (ac > bc) {
							return -1;
						}
					}
					
				} else {

					//Same as the regexp check in the 'if' part.
					if((!ac.match(/[^\d\.]/) && ac.match(/[\d\.]*/)) && 
						(!bc.match(/[^\d\.]/) && bc.match(/[\d\.]*/)) 
					){
						if( (ac - 0) < (bc - 0) ) {
							return -1;
						}
						if( (ac - 0) > (bc - 0) ) {
							return 1;
						}
					} else {
						if (ac < bc) {
							return -1;
						}
						if (ac > bc) {
							return 1;
						}
					}

				}

				return 0;
			});

			return models;
		},
    
		// The actual place where the collection is filtered.
		// Check setFilter for arguments explicacion.
		_filter: function ( models, fields, filter ) {

			// We accept fields to be a string or an array,
			// but if string is passed we need to convert it
			// to an array.
			if( _.isString( fields ) ) {
				var tmp_s = fields;
				fields = [];
				fields.push(tmp_s);
			}
			
			// 'filter' can be only a string.
			// If 'filter' is string we need to convert it to 
			// a regular expression. 
			// For example, if 'filter' is 'black dog' we need
			// to find every single word, remove duplicated ones (if any)
			// and transform the result to '(black|dog)'
			if( filter === '' || !_.isString(filter) ) {
				return models;
			} else {
				filter = filter.match(/\w+/ig);
				filter = _.uniq(filter);
				var pattern = "(" + filter.join("|") + ")";
				var regexp = new RegExp(pattern, "igm");
			}
			
			var filteredModels = [];

			// We need to iterate over each model
			_.each( models, function( model ) {

				// and over each field of each model
				_.each( fields, function( field ) {

					var value = model.get( field );

					if( value ) {
					
						// The regular expression we created earlier let's us to detect if a
						// given string contains each and all of the words in the regular expression
						// or not, but in both cases match() will return an array containing all 
						// the words it matched.
						var matches = model.get( field ).toString().match( regexp );
						matches = _.map(matches, function(match) {
							return match.toString().toLowerCase();
						});
						
						// We just need to check if the returned array contains all the words in our
						// regex, and if it does, it means that we have a match, so we should save it.
						if( _.isEmpty( _.difference(filter, matches) ) ) {
							filteredModels.push(model);
						}
						
					}

				});

			});

			return filteredModels;
		},

		// You shouldn't need to call info() as this method is used to
		// calculate internal data as first/prev/next/last page...
		info: function () {
			var self = this,
				info = {},
				totalRecords = (self.sortedAndFilteredModels) ? self.sortedAndFilteredModels.length : self.length,
				totalPages = Math.ceil(totalRecords / self.displayPerPage);

			info = {
				totalRecords: totalRecords,
				page: self.page,
				perPage: this.displayPerPage,
				totalPages: totalPages,
				lastPage: totalPages,
				lastPagem1: totalPages - 1,
				previous: false,
				next: false,
				page_set: [],
				startRecord: (self.page - 1) * this.displayPerPage + 1,
				endRecord: Math.min(totalRecords, self.page * this.displayPerPage) 
			};

			if (self.page > 1) {
				info.prev = self.page - 1;
			}

			if (self.page < info.totalPages) {
				info.next = self.page + 1;
			}

			info.pageSet = self.setPagination(info);

			self.information = info;			
			return info;
		},


		// setPagination also is an internal function that shouldn't be called directly.
		// It will create an array containing the pages right before and right after the
		// actual page.
		setPagination: function ( info ) {
			var pages = [], i = 0, l = 0;


			// How many adjacent pages should be shown on each side?
			var ADJACENT = 3,
				ADJACENTx2 = ADJACENT * 2,
				LASTPAGE = Math.ceil(info.totalRecords / info.perPage),
				LPM1 = -1;

			if (LASTPAGE > 1) {
				// not enough pages to bother breaking it up
				if (LASTPAGE < (7 + ADJACENTx2)) {
					for (i = 1, l = LASTPAGE; i <= l; i++) {
						pages.push(i);
					}
				}
				// enough pages to hide some
				else if (LASTPAGE > (5 + ADJACENTx2)) {

					//close to beginning; only hide later pages
					if (info.page < (1 + ADJACENTx2)) {
						for (i = 1, l = 4 + ADJACENTx2; i < l; i++) {
							pages.push(i);
						}
					}

					// in middle; hide some front and some back
					else if (LASTPAGE - ADJACENTx2 > info.page && info.page > ADJACENTx2) {
						for (i = info.page - ADJACENT; i <= info.page + ADJACENT; i++) {
							pages.push(i);
						}
					}
					// close to end; only hide early pages
					else {
						for (i = LASTPAGE - (2 + ADJACENTx2); i <= LASTPAGE; i++) {
							pages.push(i);
						}
					}
				}
			}

			return pages;
		}

	});


	// @name: requestPager
	//
	// Paginator for server-side data being requested from a backend/API
	//
	// @description:
	// This paginator is responsible for providing pagination
	// and sort capabilities for requests to a server-side
	// data service (e.g an API)
	//
	Paginator.requestPager = Backbone.Collection.extend({

		sync: function ( method, model, options ) {

			var queryMap = {}, params;
				queryMap[this.perPageAttribute] =  this.perPage;
				queryMap[this.skipAttribute] = this.page * this.perPage;
				queryMap[this.orderAttribute] =  this.sortField;
				queryMap[this.customAttribute1] =  this.customParam1;
				queryMap[this.formatAttribute] =  this.format;
				queryMap[this.customAttribute2] = this.customParam2;
				queryMap[this.queryAttribute] =  this.query;

				params = _.extend({
				type: 'GET',
				dataType: 'jsonp',
				jsonpCallback: 'callback',
				data: decodeURIComponent($.param(queryMap)),
				url: _.result(this, 'url'),
				processData: false
			}, options);

			return $.ajax(params);
		},


		requestNextPage: function () {
			if ( this.page !== undefined ) {
				this.page += 1;
				// customize as needed. For the Netflix API, skipping ahead based on
				// page * number of results per page was necessary. You may have a
				// simpler server-side pagination API where just updating 
				// the 'page' value is all you need to do.
				// This applies similarly to requestPreviousPage()
				this.pager();
			}
		},

		requestPreviousPage: function () {
			if ( this.page !== undefined ) {
				this.page -= 1;
				this.pager();
			}
		},

		updateOrder: function ( column ) {
			if (column !== undefined) {
				this.sortField = column;
				this.pager();
			}

		},

		goTo: function ( page ) {
			if(page !== undefined){
				this.page = parseInt(page, 10);
				this.pager();				
			}
		},

		howManyPer: function ( count ) {
			if( count !== undefined ){
				this.page = this.firstPage;
				this.perPage = count;
				this.pager();				
			}
		},

		sort: function () {
			//assign to as needed.
		},

		info: function () {

			var info = {
				page: this.page,
				firstPage: this.firstPage,
				totalPages: this.totalPages,
				lastPage: this.totalPages,
				perPage: this.perPage
			};

			this.information = info;
			return info;
		},

		// fetches the latest results from the server
		pager: function () {
			this.fetch({});
		}


	});

	return Paginator;

}( Backbone, _, jQuery ));