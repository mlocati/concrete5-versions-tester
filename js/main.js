(function(undefined) {
"use strict";
var viewer = null;

var storage = (function() {
	var ls = (window.localStorage && window.JSON && window.JSON.parse && window.JSON.stringify) ? window.localStorage : null, local = {};
	return {
		setSchema: function(schema) {
			if(ls && (ls.getItem('schema') !== schema)) {
				ls.clear();
				ls.setItem('schema', schema);
			}
		},
		has: function(key) {
			if(ls) {
				return (ls.getItem(key) !== null);
			}
			else {
				return (key in local);
			}
		},
		get: function(key) {
			var v = (ls ? ls.getItem(key) : local[key]);
			if(typeof(v) != 'string') {
				return null;
			}
			return ls ? JSON.parse(v) : v;
		},
		set: function(key, value) {
			if(value === null) {
				if(ls) {
					ls.removeItem(key);
				}
				else {
					delete local[key];
				}
			}
			else {
				if(ls) {
					ls.setItem(key, JSON.stringify(value));
				}
				else {
					local[key] = value;
				}
			}
		}
	};
})();

function emptyArrayToEmptyObject(item) {
	return ($.isArray(item) && (item.length === 0)) ? {} : item;
}

function Version(code, data) {
	this.code = code;
	for(var k in data) {
		this[k] = data[k];
	}
	$('#options-versions-list').append($('<li />')
		.append($('<label />')
			.text(' ' + this.code)
			.prepend(this.$shown = $('<input type="checkbox" />'))
		)
	);
	Version.all.push(this);
}
Version.all = [];
Version.compare = function(version1, version2) {
	function getChunks(version) {
		var specials = {'dev': -6, 'alpha': -5, 'a': -5, 'beta': -4, 'b': -4, 'RC': -3, 'rc': -3, '#': -2, 'pl': 1, 'p': 1};
		if(typeof(version) != 'string') {
			version = '';
		}
		var chunks = [];
		$.each(version.replace(/[_\-+]/g, '.').replace(/([^.\d]+)/g, '.$1.').replace(/\.\.+/g, '.').replace(/^\.+|\.+$/g, '').split('.'), function(_, s) {
			if(s.length) {
				if(/^\d+$/g.test(s)) {
					chunks.push(parseInt(s, 10));
				}
				else if(s in specials) {
					chunks.push(specials[s]);
				}
				else {
					chunks.push(-100);
				}
			}
		});
		return chunks;
	}
	var chunks1 = getChunks(version1), chunks2 = getChunks(version2), maxChunks = Math.max(chunks1.length, chunks2.length), chunkIndex, chunk1, chunk2, cmp = 0;
	for(chunkIndex = 0; chunkIndex < maxChunks; chunkIndex++) {
		chunk1 = (chunks1.length >= chunkIndex) ? chunks1[chunkIndex] : 0;
		chunk2 = (chunks2.length >= chunkIndex) ? chunks2[chunkIndex] : 0;
		if(chunk1 === chunk2) {
			continue;
		}
		if(chunk1 < chunk2) {
			cmp = -1;
		}
		else {
			cmp = 1;
		}
		break;
	}
	return cmp;
};
Version.configured = function() {
	var dir = storage.get('versions::order-descending') ? -1 : 1;
	Version.all.sort(function(v1, v2) {
		return Version.compare(v1.code, v2.code) * dir;
	});
	$.each(Version.all, function() {
		this.hidden = storage.get('versions::' + this.code + '::hidden') ? true : false;
	});
};
Version.getVisible = function() {
	var l = [];
	$.each(Version.all, function() {
		if(!this.hidden) {
			l.push(this);
		}
	});
	return l;
};

function Type(data) {
	var me = this;
	for(var k in data) {
		me[k] = data[k];
	}
	switch(me.handle) {
		case 'constants':
			me.caseSensitive = true;
			break;
		default:
			me.caseSensitive = false;
			break;
	}
	$('#options-operations').append($('<label class="radio-inline" />')
		.text(me.nameN)
		.prepend($('<input type="radio" name="options-type" />')
			.on('change', function() {
				if(this.checked) {
					me.activate();
				}
			})
		)
	);
	Type.all.push(me);
}
Type.all = [];
Type.prototype = {
	activate: function() {
		var me = this;
		$('#options .panel-body .type-specific').remove();
		switch(me.handle) {
			case 'helpers':
			case 'libraries':
			case 'models':
				$('#options .panel-body').append(me.$showClassesRow = $('<div class="row type-specific" />')
					.append('<div class="col-md-2"><label>List</label></div>')
					.append($('<div class="col-md-6" />')
						.append($('<div class="radio"><label><input type="radio" name="show-methods" value=""' + (me.showMethods ? '' : ' checked') + '> show all classes</label></div>'))
						.append($('<div class="radio" />')
							.append($('<label><input type="radio" name="show-methods" value="1"' + (me.showMethods ? ' checked' : '') + '> show methods of </label>')
								.append($('<span />')
									.append(me.$classes = $('<select></select>')
										.on('change', function() {
											me.methodsForClass = this.value;
											me.view();
										})
									)
								)
							)
						)
					)
				);
				me.$classes.chosen({width: '400px', placeholder_text: 'select a ' + me.name1});
				var upd = function(view) {
					me.showMethods = me.$showClassesRow.find('input[name="show-methods"]:checked').val() ? true : false;
					me.$classes.closest('span').css('visibility', me.showMethods ? '' : 'hidden');
					if(view) {
						me.view();
					}
				};
				me.$showClassesRow.find('input[name="show-methods"]').on('change', function() {
					if(this.checked) {
						upd(true);
					}
				});
				upd();
				break;
		}
		switch(me.handle) {
			case 'constants':
			case 'functions':
			case 'libraries':
				$('#options .panel-body').append($('<div class="row type-specific" />')
					.append('<div class="col-md-2"><label>3<sup>rd</sup> party</label></div>')
					.append($('<div class="col-md-6" />')
						.append($('<label class="checkbox-inline">show ' + me.nameN + ' defined by 3rd party components</label>')
							.prepend($('<input type="checkbox" ' + (me.show3rdParty ? 'checked' : '') + ' />')
								.on('click', function() {
									me.show3rdParty = this.checked;
									me.updateOptionsState();
									me.view();
								})
							)
						)
					)
				);
				break;
		}
		switch(me.handle) {
			case 'constants':
				$('#options .panel-body').append($('<div class="row type-specific" />')
					.append('<div class="col-md-2"><label>Availability</label></div>')
					.append($('<div class="col-md-6" />')
						.append($('<label class="checkbox-inline">show ' + me.nameN + ' that may not be always defined</label>')
							.prepend($('<input type="checkbox" ' + (me.showNotAlways ? 'checked' : '') + ' />')
								.on('click', function() {
									me.showNotAlways = this.checked;
									me.view();
								})
							)
						)
					)
				);
				break;
		}
		Type.active = me;
		me.updateOptionsState();
		me.view();
	},
	updateOptionsState: function() {
		var me = this;
		if(this.$showClassesRow) {
			var done = {}, list = [];
			$.each(Version.getVisible(), function() {
				for(var c in storage.get(me.handle + '@' + this.code)) {
					var clc = c.toLowerCase();
					if(!(clc in done)) {
						done[clc] = true;
						list.push(c);
					}
				}
			});
			list.sort(function(a, b) {
				var alc = a.toLowerCase(), blc = b.toLowerCase();
				if(alc < blc) {
					return -1;
				}
				if(alc > blc) {
					return 1;
				}
				return 0;
			});
			me.$classes.empty().html('<option value="" selected />');
			$.each(list, function(_, c) {
				me.$classes.append($('<option />').val(c).text(c));
			});
			if(me.methodsForClass && ($.inArray(me.methodsForClass, list) >= 0)) {
				me.$classes.val(me.methodsForClass);
			}
			else {
				me.methodsForClass = '';
			}
			me.$classes.trigger('chosen:updated');
		}
	},
	view: function() {
		var me = this;
		$('#result').empty();
		var versions = Version.getVisible();
		if(!versions.length) {
			$('#result').html('<div class="alert alert-danger">Please select at least one version</div>');
			return;
		}
		var viewType = 'flat', viewOptions = {};
		switch(me.handle) {
			case 'helpers':
			case 'libraries':
			case 'models':
				if(me.showMethods) {
					if(!me.methodsForClass) {
						$('#result').html('<div class="alert alert-info">Please select which ' + me.name1 + ' you want to view</div>');
						return;
					}
					viewType = 'methods';
					viewOptions.className = me.methodsForClass;
				}
				break;
		}
		me['view_' + viewType](versions, viewOptions);
	},
	view_flat: function(versions) {
		var me = this;
		var filters = [];
		switch(me.handle) {
			case 'constants':
			case 'functions':
			case 'libraries':
				if(!me.show3rdParty) {
					filters.push(function(info) {
						return info.is3rdParty ? true : false;
					});
				}
				break;
		}
		switch(me.handle) {
			case 'constants':
				if(!me.showNotAlways) {
					filters.push(function(info) {
						return info.always ? false : true;
					});
				}
				break;
		}
		var filter = null;
		var nFilters = filters.length;
		if(nFilters) {
			filter = function(info) {
				for(var i = 0; i < nFilters; i++) {
					if(filters[i](info)) {
						return true;
					}
				}
				return false;
			};
		}
		var structured = {};
		$.each(versions, function(vi) {
			var all = storage.get(me.handle + '@' + this.code), info;
			for(var name in all) {
				info = all[name];
				if(filter && filter(info)) {
					continue;
				}
				var nameLC = name.toLowerCase();
				var key = me.caseSensitive ? name : nameLC;
				if(!(key in structured)) {
					structured[key] = {sorter: nameLC, name: name, v: []};
				}
				structured[key].v[vi] = info;
			}
		});
		var flat = [];
		for(var k in structured) {
			flat.push(structured[k]);
		}
		flat.sort(function(a, b) {
			if(a.sorter < b.sorter) {
				return -1;
			}
			if(a.sorter > b.sorter) {
				return 1;
			}
			return 0;
		});
		if(!flat.length) {
			$('#result').html('<div class="alert alert-info">No result</div>');
			return;
		}
		var hasDefinitions = false;
		switch(me.handle) {
			default:
				hasDefinitions = true;
				break;
		}
		var variableProperties = null;
		switch(me.handle) {
			case 'functions':
				variableProperties = ['parameters'];
				break;
		}
		var $tr, $tb;
		$('#result').append($('<table class="table table-bordered" />')
			.append($('<thead />')
				.append($tr = $('<tr />')
					.append('<th />')
				)
			)
			.append($tb = $('<tbody />'))
		);
		$.each(versions, function() {
			$tr.append($('<th />').text(this.code));
		});
		$.each(flat, function() {
			$tb.append($tr = $('<tr />')
				.append($('<th' + (hasDefinitions ? ' rowspan="2"' : '') + ' />').text(this.name))
			);
			var info, nextCells = [], previous = null, exists, $td;
			for(var vi = 0; vi < versions.length; vi++) {
				info = this.v[vi];
				exists = info ? true : false;
				if(previous && (previous.exists === exists) && (!exists)) {
					previous.$td.prop('colspan', 1 + (previous.$td.prop('colspan') || 1));
				}
				else {
					if(exists) {
						$tr.append($td = $('<td class="is-available' + (hasDefinitions ? ' one-of-two' : '') + '">&#x2713;</td>'));
					}
					else {
						$tr.append($td = $('<td' + (hasDefinitions ? ' rowspan="2"' : '') + ' class="not-available">&#x2717;</td>'));
					}
					previous = {exists: exists, $td: $td};
				}
				if(hasDefinitions && exists) {
					nextCells.push($('<td class="two-of-two definitions"><a href="javascript:void(0)" title="Source code"><img src="images/source-code.png" alt="code" /></td>'));
				}
			}
			if(nextCells.length) {
				$tb.append($tr = $('<tr />'));
				$.each(nextCells, function() {
					$tr.append(this);
				});
			}
		});
	},
	view_methods: function(versions, options) {
		var me = this;
		var classNameLC = options.className.toLowerCase(), loadParsed = [], loadToBeParsed = [];
		$.each(versions, function(vi) {
			var classList = storage.get(me.handle + '@' + this.code);
			for(var cn in classList) {
				if(cn.toLowerCase() === classNameLC) {
					if(classList[cn][vi].methodsParsed) {
						if(storage.get(me.handle + '::' + classNameLC + '@' + this.code) === null) {
							loadParsed.push(this.code);
						}
					}
					else {
						loadToBeParsed.push(this.code);
					}
					break;
				}
			}
		});
		var loads = [];
		if(loadParsed.length) {
			loads.push({type: 'parsed', data: {versions: loadParsed}});
		}
		$.each(loadToBeParsed, function(_, version) {
			loads.push({type: 'toBeParsed', data: {version: version}});
		});
		function loadNext(loadIndex, dataReady) {
			if(loadIndex >= loads.length) {
				dataReady();
				return;
			}
			var load = loads[loadIndex];
			var action;
			switch(load.type) {
				case 'parsed':
					setWorking('Loading pre-parsed methods of ' + options.className + ' for versions<br>' + load.data.versions.join(', '));
					process('get-parsed-methods', $.extend({category: me.classCategory, 'class': options.className}, load.data), false, function(ok, result) {
						if(!ok) {
							setWorking(false);
							alert(result);
							return;
						}
						for(var version in result) {
							storage.set(me.handle + '::' + classNameLC + '@' + version, emptyArrayToEmptyObject(result[version]));
						}
						loadNext(loadIndex + 1, dataReady);
					});
					break;
				case 'toBeParsed':
					setWorking('Parse and load methods of ' + options.className + ' for version<br>' + load.data.version);
					process('get-version-methods', $.extend({category: me.classCategory, 'class': options.className}, load.data), false, function(ok, result) {
						if(!ok) {
							setWorking(false);
							alert(result);
							return;
						}
						storage.set(me.handle + '::' + classNameLC + '@' + load.data.version, emptyArrayToEmptyObject(result));
						var classList = storage.get(me.handle + '@' + load.data.version);
						for(var cn in classList) {
							if(cn.toLowerCase() === classNameLC) {
								classList[cn].methodsParsed = true;
								storage.set(me.handle + '@' + load.data.version, classList);
								break;
							}
						}
						loadNext(loadIndex + 1, dataReady);
					});
					break;
			}
		}
		loadNext(0, function() {
			setWorking(false);
			var methods = [];
			var classInfo = []; 
			$.each(versions, function(vi) {
				var classList = storage.get(me.handle + '@' + this.code);
				for(var cn in classList) {
					if(cn.toLowerCase() === classNameLC) {
						classInfo[vi] = classList[cn];
						methods[vi] = storage.get(me.handle + '::' + classNameLC + '@' + this.code);
						break;
					}
				}
			});
		});
	}
};
new Type({name1: 'constant', nameN: 'constants', handle: 'constants', actionGetParsed: 'get-parsed-constants', actionGetUnparsed: 'get-version-constants'});
new Type({name1: 'function', nameN: 'functions', handle: 'functions', actionGetParsed: 'get-parsed-functions', actionGetUnparsed: 'get-version-constants'});
new Type({name1: 'helper', nameN: 'helpers', handle: 'helpers', actionGetParsed: 'get-parsed-classes', classCategory: 'helper', actionGetUnparsed: 'get-parsed-constants'});
new Type({name1: 'library', nameN: 'libraries', handle: 'libraries', actionGetParsed: 'get-parsed-classes', classCategory: 'library', actionGetUnparsed: 'get-parsed-constants'});
new Type({name1: 'model', nameN: 'models', handle: 'models', actionGetParsed: 'get-parsed-classes', classCategory: 'model', actionGetUnparsed: 'get-parsed-constants'});

function setWorking(html) {
	if((typeof(html) == 'string') || (html === true)) {
		$('#working-text').html(((html === true)|| (!html.length)) ? 'Working... Please wait' : html);
		$('#working').show().focus();
	}
	else {
		$('#working').hide();
	}
}

function process(action, data, post, callback) {
	var url = 'process.php?action=' + action;
	$.ajax({
		type: post ? 'POST' : 'GET',
		url: url,
		async: true,
		cache: false,
		dataType: 'json',
		data: data
	})
	.done(function(result) {
		if(result === null) {
			callback(false, 'No response from server');
		}
		else {
			callback(true, result);
		}
	})
	.fail(function(xhr) {
		var msg = '?';
		try {
			if(!xhr.getResponseHeader('Content-Type').indexOf('text/plain')) {
				msg = xhr.responseText;
			}
			else if(xhr.status === 200) {
				msg = 'Internal error';
			}
			else {
				msg = xhr.status + ': ' + xhr.statusText;
			}
		}
		catch(e) {
		}
		callback(false, msg);
	});
}

$(window.document).ready(function() {
	setWorking('Loading initial data...');
	process('initialize', null, false, function(ok, result) {
		if(!ok) {
			setWorking(false);
			alert(result);
			return;
		}
		if(!result) {
			setWorking(false);
			alert('Empty result from server');
			return;
		}
		if((!result.versions) || $.isEmptyObject(result.versions) || $.isArray(result.versions)) {
			setWorking(false);
			alert('No versions found!');
			return;
		}
		setWorking('Processing...');
		storage.setSchema(result.schema);
		$.each(result.versions, function(code, data) {
			new Version(code, data);
		});
		Version.configured();
		function processNextType(typeIndex, cb) {
			if(typeIndex >= Type.all.length) {
				cb();
				return;
			}
			var type = Type.all[typeIndex];
			var loadParsed = [], loadToBeParsed = [];
			$.each(Version.all, function(_, version) {
				if(version[type.handle + 'Parsed']) {
					if(!storage.has(type.handle + '@' + version.code)) {
						loadParsed.push(version.code);
					}
				}
				else {
					loadToBeParsed.push(version.code);
				}
			});
			var loads = [];
			if(loadParsed.length) {
				loads.push({type: 'parsed', data: {versions: loadParsed}});
			}
			$.each(loadToBeParsed, function(_, version) {
				loads.push({type: 'toBeParsed', data: {version: version}});
			});
			function loadNext(loadIndex) {
				if(loadIndex >= loads.length) {
					processNextType(typeIndex + 1, cb);
					return;
				}
				var load = loads[loadIndex];
				var action;
				switch(load.type) {
					case 'parsed':
						setWorking('Loading pre-parsed ' + type.nameN + ' for versions<br>' + load.data.versions.join(', '));
						if(type.classCategory) {
							action = 'get-parsed-classes';
							load.data.category = type.classCategory;
						}
						else {
							action = 'get-parsed-' + type.handle;
						}
						process(action, load.data, false, function(ok, result) {
							if(!ok) {
								setWorking(false);
								alert(result);
								return;
							}
							for(var version in result) {
								storage.set(type.handle + '@' + version, emptyArrayToEmptyObject(result[version]));
							}
							loadNext(loadIndex + 1);
						});
						break;
					case 'toBeParsed':
						setWorking('Parse and load ' + type.nameN + ' for version<br>' + load.data.version);
						if(type.classCategory) {
							action = 'get-version-classes';
							load.data.category = type.classCategory;
						}
						else {
							action = 'get-version-' + type.handle;
						}
						process(action, load.data, false, function(ok, result) {
							if(!ok) {
								setWorking(false);
								alert(result);
								return;
							}
							storage.set(type.handle + '@' + load.data.version, emptyArrayToEmptyObject(result));
							loadNext(loadIndex + 1);
						});
						break;
				}
			}
			loadNext(0);
		}
		processNextType(0, function() {
			$('#dialog-options-versions').on('show.bs.modal', function() {
				$.each(Version.all, function() {
					this.$shown.prop('checked', !this.hidden);
				});
				$(storage.get('versions::order-descending') ? '#options-versions-desc' : '#options-versions-asc').prop('checked', true);
			});
			$('#options-versions-apply').on('click', function() {
				$.each(Version.all, function() {
					this.hidden = !this.$shown.prop('checked');
					storage.set('versions::' + this.code + '::hidden', this.hidden ? true : null);
				});
				storage.set('versions::order-descending', $('#options-versions-desc').is(':checked') ? true : null);
				$('#dialog-options-versions').modal('hide');
				Version.configured();
				if(Type.active) {
					Type.active.updateOptionsState();
					Type.active.view();
				}
			});
			$('.hide-until-ready').show();
			setWorking();
		});
	});
});

})();
