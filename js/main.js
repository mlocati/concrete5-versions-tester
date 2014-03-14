(function(undefined) {
"use strict";
var codeMirrorReady = false;

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
			if((value === null) || (value === undefined)) {
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
		},
		isPermanent: ls ? true : false,
		getPermanentSize: function() {
			var size = 0;
			if(ls) {
				for(var key in ls) {
					size += key.length + (ls[key] ? ls[key].length : 0);
				}
			}
			if(size === 0) {
				return '0 bytes';
			}
			if(size < 1000) {
				return 'about ' + size + ' bytes';
			}
			size /= 1024;
			if(size < 1000) {
				return 'about ' + size.toFixed(1) + ' KB';
			}
			size /= 1024;
			if(size < 1000) {
				return 'about ' + size.toFixed(1) + ' MB';
			}
			size /= 1024;
			return 'about ' + size.toFixed(1) + ' GB';
		},
		clearPermanentData: function() {
			if(ls) {
				ls.clear();
			}
		}
	};
})();

function emptyArrayToEmptyObject(item) {
	return ($.isArray(item) && (item.length === 0)) ? {} : item;
}

function is3rdParty(definitions) {
	var path = 'concrete/libraries/3rdparty/';
	if(typeof(definitions) === 'string') {
		return definitions.indexOf(path) ? false : true;
	}
	var r = false;
	if(definitions) {
		$.each(definitions, function() {
			if(this.file.indexOf(path)) {
				r = false;
				return false;
			}
			r = true;
		});
	}
	return r;
}

function setDefinitions($td, version, info) {
	$td.append($('<a href="javascript:void(0)" class="definitions" title="Show definition"><img src="images/source-code.png" alt="code"></a>')
		.on('click', function() {
			showDefinitions(version, info);
		})
	);
}
function showDefinitions(version, info) {
	var items = [], loads = [];
	function getItem(i) {
		if(!(i && i.file)) {
			return;
		}
		var item = {file: i.file};
		if(i.line) {
			item.lineStart = i.line;
		}
		else if(i.lineStart && i.lineEnd) {
			item.lineStart = i.lineStart;
			item.lineEnd = i.lineEnd;
		}
		var content = storage.get('source::' + item.file + '@' + version.code);
		if(content === null) {
			loads.push(items.length);
		}
		else {
			item.content = content;
		}
		items.push(item);
	}
	getItem(info);
	if($.isArray(info.definitions)) {
		$.each(info.definitions, function() {
			getItem(this);
		});
	}
	if(!items.length) {
		alert('Definitions not available');
		return;
	}
	function loadNext(loadIndex, cb) {
		if(loadIndex >= loads.length) {
			cb();
			return;
		}
		var item = items[loads[loadIndex]];
		setWorking('Loading source code of ' + item.file + ' for version ' + version.code);
		process('get-source', {version: version.code, file: item.file}, false, function(ok, result) {
			if(!ok) {
				setWorking(false);
				alert(result);
				return;
			}
			storage.set('source::' + item.file + '@' + version.code, result);
			item.content = result;
			loadNext(loadIndex + 1, cb);
		});
	}
	loadNext(0, function() {
		setWorking(false);
		var $s = $('#definitions-which');
		$s.empty();
		$.each(items, function() {
			this.version = version;
			var name = this.file;
			if(this.lineStart) {
				name += '@' + this.lineStart;
				if(this.lineEnd) {
					name += '-' + this.lineEnd;
				}
			}
			$s.append($('<option />')
				.text(name)
				.data('item', this)
			);
		});
		$('#dialog-definitions').modal('show');
	});
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
		chunk1 = (chunks1.length > chunkIndex) ? chunks1[chunkIndex] : 0;
		chunk2 = (chunks2.length > chunkIndex) ? chunks2[chunkIndex] : 0;
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
		var me = this, $tmp, $hideOnMethods = null;
		$('#options .panel-body .type-specific').remove();
		switch(me.handle) {
			case 'helpers':
			case 'libraries':
			case 'models':
				$('#options .panel-body').append(me.$showClassesRow = $('<div class="row type-specific" />')
					.append('<div class="col-md-2"><label>List</label></div>')
					.append($('<div class="col-md-6" />')
						.append($tmp = $('<div class="radio"><label><input type="radio" name="show-methods" value=""' + (me.showMethods ? '' : ' checked') + '> show all classes</label></div>'))
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
				if(me.handle === 'libraries') {
					$tmp.append($hideOnMethods = $('<label class="checkbox-inline">include 3rd party libraries</label>')
						.prepend($('<input type="checkbox" ' + (me.show3rdParty ? 'checked' : '') + ' style="float: none; margin-left: 0; margin-right: 10px" />')
							.on('click', function() {
								me.show3rdParty = this.checked;
								me.view();
							})
						)
					);
				}
				me.$classes.chosen({width: '400px', placeholder_text: 'select a ' + me.name1});
				var upd = function(view) {
					me.showMethods = me.$showClassesRow.find('input[name="show-methods"]:checked').val() ? true : false;
					if($hideOnMethods) {
						$hideOnMethods.css('visibility', me.showMethods ? 'hidden' : '');
					}
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
				$('#options .panel-body').append($('<div class="row type-specific" />')
					.append('<div class="col-md-2"><label>3<sup>rd</sup> party</label></div>')
					.append($('<div class="col-md-6" />')
						.append($('<label class="checkbox-inline">show ' + me.nameN + ' defined by 3rd party components</label>')
							.prepend($('<input type="checkbox" ' + (me.show3rdParty ? 'checked' : '') + ' />')
								.on('click', function() {
									me.show3rdParty = this.checked;
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
				var classes = storage.get(me.handle + '@' + this.code), c;
				for(c in classes) {
					var clc = c.toLowerCase();
					if(!(clc in done)) {
						if(!classes[c].is3rdParty) {
							done[clc] = true;
							list.push(c);
						}
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
		$('#result').hide().empty().show();
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
		var flats = [];
		for(var k in structured) {
			flats.push(structured[k]);
		}
		this._view(versions, flats);
	},
	view_methods: function(versions, options) {
		var me = this;
		var classNameLC = options.className.toLowerCase(), loadParsed = [], loadToBeParsed = [];
		$.each(versions, function() {
			var classList = storage.get(me.handle + '@' + this.code);
			for(var cn in classList) {
				if(cn.toLowerCase() === classNameLC) {
					if(classList[cn].methodsParsed) {
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
							result[version] = emptyArrayToEmptyObject(result[version]);
							storage.set(me.handle + '::' + classNameLC + '@' + version, result[version]);
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
						result = emptyArrayToEmptyObject(result);
						storage.set(me.handle + '::' + classNameLC + '@' + load.data.version, result);
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
			var methods, classInfo = [], structured = {};
			$.each(versions, function(vi) {
				var classList = storage.get(me.handle + '@' + this.code), name, nameLC;
				for(var cn in classList) {
					if(cn.toLowerCase() === classNameLC) {
						classInfo[vi] = classList[cn];
						methods = storage.get(me.handle + '::' + classNameLC + '@' + this.code);
						for(name in methods) {
							nameLC = name.toLowerCase();
							if(!(nameLC in structured)) {
								structured[nameLC] = {sorter: nameLC, name: name, v: []};
							}
							structured[nameLC].v[vi] = methods[name];
						}
						break;
					}
				}
			});
			var flats = [];
			for(var k in structured) {
				flats.push(structured[k]);
			}
			me._view(versions, flats, classInfo);
		});
	},
	_view: function(versions, flats, classInfo) {
		var me = this;
		flats.sort(function(a, b) {
			if(a.sorter < b.sorter) {
				return -1;
			}
			if(a.sorter > b.sorter) {
				return 1;
			}
			return 0;
		});
		if(!flats.length) {
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
		if(classInfo) {
			variableProperties = ['modifiers', 'parameters'];
		}
		else {
			switch(me.handle) {
				case 'functions':
					variableProperties = ['parameters'];
					break;
			}
		}
		var methodsShower = null;
		if(!classInfo) {
			switch(me.handle) {
				case 'helpers':
				case 'libraries':
				case 'models':
					methodsShower = function(name) {
						$('input[name="show-methods"][value="1"]').prop('checked', true).trigger('change');
						me.$classes.val(name).trigger('change').trigger('chosen:updated');
					};
					break;
			}
		}
		var $tr, $tb, $td;
		$('#result').append($('<table class="table table-bordered table-striped" />')
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
		var vi, m = null, $th;
		if(classInfo) {
			$tb.append($tr = $('<tr />')
				.append($th = $('<th />'))
			);
			for(vi = 0; vi < versions.length; vi++) {
				if(classInfo[vi]) {
					if(m === null) {
						switch(me.handle) {
							case 'helpers':
								if((m = /^concrete\/helpers\/(.*)\.php/.exec(classInfo[vi].file)) !== null) {
									$th.append($('<span class="loader-info" />').text("Loader::helper('" + m[1] + "')"));
								}
								break;
							case 'libraries':
								if((m = /^concrete\/libraries\/(.*)\.php/.exec(classInfo[vi].file)) !== null) {
									$th.append($('<span class="loader-info" />').text("Loader::library('" + m[1] + "')"));
								}
								break;
							case 'models':
								if((m = /^concrete\/models\/(.*)\.php/.exec(classInfo[vi].file)) !== null) {
									$th.append($('<span class="loader-info" />').text("Loader::model('" + m[1] + "')"));
								}
								break;
						}
					}
					$tr.append($td = $('<td class="is-available">&#x2713;</td>'));
					setDefinitions($td, versions[vi], classInfo[vi]);
				}
				else {
					$tr.append('<td class="not-available">&#x2717;</td>');
				}
			}
		}
		$.each(flats, function() {
			var flat = this;
			var pi, pn;
			var first = true, common = {}, differences = null;
			if(variableProperties) {
				for(vi = 0; vi < versions.length; vi++) {
					if(!flat.v[vi]) {
						continue;
					}
					if(first) {
						for(pi = 0; pi < variableProperties.length; pi++) {
							common[variableProperties[pi]] = flat.v[vi][variableProperties[pi]];
						}
						first = false;
						continue;
					}
					for(pn in common) {
						if(common[pn] !== flat.v[vi][pn]) {
							delete common[pn];
							if(differences === null) {
								differences = {};
							}
							differences[pn] = true;
						}
					}
				}
			}
			var info;
			$tb.append($tr = $('<tr />')
				.append($td = $('<th />'))
			);
			var $parent, enableMethods = false;
			if(methodsShower) {
				enableMethods = true;
				switch(me.handle) {
					case 'libraries':
						enableMethods = false;
						for(vi = 0; vi < versions.length; vi++) {
							if(flat.v[vi] && !flat.v[vi].is3rdParty) {
								enableMethods = true;
								break;
							}
						}
						break;
				}
			}
			if(enableMethods) {
				$td.append($parent = $('<a href="javascript:void(0)" />')
					.on('click', function() {
						methodsShower(flat.name);
					})
				);
			}
			else {
				$parent = $td;
			}
			if(('modifiers' in common) && common.modifiers.length) {
				$parent.append($('<span class="modifiers" />').text(common.modifiers));
			}
			$parent.append($('<span class="name" />').text(flat.name));
			if('parameters' in common) {
				$parent.append($('<span class="parameters" />').text(common.parameters));
			}
			var previousSpecial = null, extend;
			for(vi = 0; vi < versions.length; vi++) {
				info = flat.v[vi];
				if(info) {
					if(differences) {
						extend = false;
						if(previousSpecial) {
							extend = true;
							for(pn in differences) {
								if(info[pn] !== previousSpecial.info[pn]) {
									extend = false;
									break;
								}
							}
						}
						if(extend) {
							previousSpecial.$td.prop('colspan', 1 + (previousSpecial.$td.prop('colspan') || 1));
						}
						else {
							$tr.append($td = $('<td class="method-flavor" />'));
							if(differences.modifiers && info.modifiers.length) {
								$td
									.append('<span class="label label-default">Modifiers</span>')
									.append($('<span class="modifiers" />').text(info.modifiers))
									.append('<br>')
								;
							}
							if(differences.parameters && info.parameters.length) {
								$td
									.append('<span class="label label-primary">Parameters</span>')
									.append($('<span class="parameters" />').text(info.parameters))
									.append('<br>')
								;
							}
							previousSpecial = {$td: $td, info: info};
						}
					}
					else {
						$tr.append($td = $('<td class="is-available">&#x2713;</td>'));
						setDefinitions($td, versions[vi], info);
					}
				}
				else {
					$tr.append('<td class="not-available">&#x2717;</td>');
					previousSpecial = null;
				}
			}
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
	
	var loadSubs = [
		{js: 'js/codemirror/lib/codemirror.js'},
		{css: 'js/codemirror/lib/codemirror.css'},
		{js: 'js/codemirror/mode/htmlmixed/htmlmixed.js'},
		{js: 'js/codemirror/mode/xml/xml.js'},
		{js: 'js/codemirror/mode/javascript/javascript.js'},
		{js: 'js/codemirror/mode/css/css.js'},
		{js: 'js/codemirror/mode/clike/clike.js'},
		{js: 'js/codemirror/mode/php/php.js'}
	];
	function loadNextSub(subIndex) {
		if(subIndex >= loadSubs.length) {
			codeMirrorReady = true;
			return;
		}
		var obj;
		if(loadSubs[subIndex].js) {
			obj = document.createElement('script');
			obj.src = loadSubs[subIndex].js;
		}
		else if(loadSubs[subIndex].css) {
			obj = document.createElement('link');
			obj.rel = 'stylesheet';
			obj.href = loadSubs[subIndex].css;
		}
		obj.async = true;
		obj.onload = function() {
			loadNextSub(subIndex + 1);
		};
		var oneScript = document.getElementsByTagName('script')[0];
		oneScript.parentNode.insertBefore(obj, oneScript);
	}
	loadNextSub(0);
	if(storage.isPermanent) {
		$('#top-menu ul').append('<li><a href="#" data-toggle="modal" data-target="#dialog-quit">Quit</a></li>');
		$('#dialog-quit').on('show.bs.modal', function() {
			$('#quit-ls-size').text(storage.getPermanentSize());
		});
		$('#quit').on('click', function() {
			storage.clearPermanentData();
			$(document.body).empty().html('<div class="alert alert-info" style="margin-left: 25px; margin-right: 25px; width: auto"><p>The local cache has been cleared.</p><p><button onclick="window.location.reload()" class="btn btn-default">Restart</button> <button onclick="window.close()" class="btn btn-default">Close window</button></div>');
		});
	}
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
			var thirdPartyParser = null;
			switch(type.handle) {
				case 'constants':
					thirdPartyParser = function(list) {
						for(var k in list) {
							list[k].is3rdParty = is3rdParty(list[k].definitions);
						}
					};
					break;
				case 'functions':
					thirdPartyParser = function(list) {
						for(var k in list) {
							list[k].is3rdParty = is3rdParty(list[k].file);
						}
					};
					break;
				case 'libraries':
					thirdPartyParser = function(list) {
						for(var k in list) {
							list[k].is3rdParty = list[k].file ? false : true;
						}
					};
					break;
			}
			function loadNext(loadIndex) {
				if(loadIndex >= loads.length) {
					processNextType(typeIndex + 1, cb);
					return;
				}
				var load = loads[loadIndex];
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
								result[version] = emptyArrayToEmptyObject(result[version]);
								if(thirdPartyParser) {
									thirdPartyParser(result[version]);
								}
								storage.set(type.handle + '@' + version, result[version]);
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
							result = emptyArrayToEmptyObject(result);
							if(thirdPartyParser) {
								thirdPartyParser(result);
							}
							storage.set(type.handle + '@' + load.data.version, result);
							loadNext(loadIndex + 1);
						});
						break;
				}
			}
			loadNext(0);
		}
		processNextType(0, function() {
			var updateMaxHeight = function() {
				$('#options-versions-list').closest('div').css('max-height', Math.max(100, $(window).height() - 400) + 'px', 'overflow', 'auto');
			};
			$('#dialog-options-versions').on('show.bs.modal', function() {
				$.each(Version.all, function() {
					this.$shown.prop('checked', !this.hidden);
				});
				$(storage.get('versions::order-descending') ? '#options-versions-desc' : '#options-versions-asc').prop('checked', true);
				updateMaxHeight();
			});
			$('#dialog-definitions').on('show.bs.modal', function() {
				$('#definitions-code').empty();
				$('#definitions-github').hide();
			});
			$('#dialog-definitions').on('shown.bs.modal', function() {
				$('#definitions-which').prop('selectedIndex', 0).trigger('change');
			});
			$('#definitions-which').on('change', function() {
				var item = $(this).find('option:selected').data('item');
				$('#definitions-code').empty();
				$('#definitions-github').hide();
				if(!item) {
					return;
				}
				var $ta;
				$('#definitions-code').append($ta = $('<textarea />').val(item.content));
				if(codeMirrorReady) {
					var cm = CodeMirror.fromTextArea(
						$ta[0],
						{
							mode: 'application/x-httpd-php',
							indentUnit: 3,
							tabSize: 3,
							indentWithTabs: true,
							lineNumbers: true,
							readOnly: true,
							autofocus: true
						}
					);
					if(item.lineStart) {
						var le = item.lineEnd || item.lineStart;
						for(var l = item.lineStart; l <= le; l++) {
							cm.addLineClass(l - 1, 'background', 'cm-hiline');
						}
						cm.setCursor(le - 1);
						cm.setCursor(item.lineStart - 1);
					}
				}
				if(item.version.codeBaseUrl) {
					var url = item.version.codeBaseUrl + '/' + item.file;
					if(item.lineStart) {
						url += '#L' + item.lineStart;
						if(item.lineEnd && (item.lineEnd > item.lineStart)) {
							url += '-' + item.lineEnd;
						}
					}
					$('#definitions-github').attr('href', url).show();
				}
			});
			$(window).on('resize', function() {
				updateMaxHeight();
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
