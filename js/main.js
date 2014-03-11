(function(undefined) {
"use strict";

var storage = (function() {
	var ls = window.localStorage || null, local = {};
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

function Version(code, data) {
	this.code = code;
	for(var k in data) {
		this[k] = data[k];
	}
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

function Type(data) {
	for(var k in data) {
		this[k] = data[k];
	}
	Type.all.push(this);
}
Type.all = [];
new Type({name1: 'constant', nameN: 'constants', handleMulti: 'constants', actionGetParsed: 'get-parsed-constants', actionGetUnparsed: 'get-version-constants'});
new Type({name1: 'function', nameN: 'functions', handleMulti: 'functions', actionGetParsed: 'get-parsed-functions', actionGetUnparsed: 'get-version-constants'});
new Type({name1: 'helper', nameN: 'helpers', handleMulti: 'helpers', actionGetParsed: 'get-parsed-classes', classCategory: 'helper', actionGetUnparsed: 'get-parsed-constants'});
new Type({name1: 'library', nameN: 'libraries', handleMulti: 'libraries', actionGetParsed: 'get-parsed-classes', classCategory: 'library', actionGetUnparsed: 'get-parsed-constants'});
new Type({name1: 'model', nameN: 'models', handleMulti: 'models', actionGetParsed: 'get-parsed-classes', classCategory: 'model', actionGetUnparsed: 'get-parsed-constants'});

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
/*
function ClassMethods(category, className, versionsData) {
	var me = this;
	me.category = category;
	me.className = className;
	me.errors = null;
	me.methods = [];
	$.each(versions, function(i) {
		var versionData = versionsData[i];
		if(versionData.error) {
			if(!me.errors) {
				me.errors = [];
			}
			me.errors[i] = versionData.error;
				return;
		}
		$.each(versionData, function(_, m) {
			var nameLC = m.name.toLowerCase();
			var method = null;
			$.each(me.methods, function() {
				if(this.nameLC === nameLC) {
					method = this;
					return false;
				}
			});
			if(!method) {
				me.methods.push(method = {name: m.name, nameLC: nameLC, availability: {}});
			}
			method.availability[versions[i]] = {modifiers: m.modifiers, parameters: m.parameters};
		});
	});
	$.each(me.methods, function(_, method) {
		$.each(versions, function(i) {
			if(!(versions[i] in method.availability)) {
				return;
			}
			var a = method.availability[versions[i]];
			if(!method.common) {
				method.common = {};
				if('modifiers' in a) {
					method.common.modifiers = a.modifiers;
				}
				if('parameters' in a) {
					method.common.parameters = a.parameters;
				}
				return;
			}
			if(('modifiers' in method.common) && (method.common.modifiers !== a.modifiers)) {
				delete method.common.modifiers;
			}
			if(('parameters' in method.common) && (method.common.parameters !== a.parameters)) {
				delete method.common.parameters;
			}
		});
	});
	me.methods.sort(function(a, b) {
		if(a.nameLC < b.nameLC) {
			return -1;
		}
		if(a.nameLC > b.nameLC) {
			return 1;
		}
		return 0;
	});
	if(!(me.category in methodsCache)) {
		methodsCache[me.category] = {};
	}
	methodsCache[me.category][me.className] = me;
}
ClassMethods.prototype = {
	show: function() {
		var me = this;
		$('#result>table>tfoot').remove();
		var $tb = $('#result>table>tbody');
		$.each(me.methods, function() {
			var method = this;
			var $td, $tr;
			$tb.append($tr = $('<tr />').append($td = $('<th class="method-name" />').text(method.name)));
			if(('modifiers' in method.common) && method.common.modifiers.length) {
				$td.prepend($('<span class="method-modifiers" />').text(method.common.modifiers));
			}
			if('parameters' in method.common) {
				$td.append($('<span class="method-parameters" />').text('(' + method.common.parameters + ')'));
			}
			var previousSpecial = null;
			$.each(versions, function(i) {
				if(me.errors && me.errors[i]) {
					previousSpecial = null;
					$tr.append($('<td />').text(me.errors[i]));
					return;
				}
				if(!(versions[i] in method.availability)) {
					previousSpecial = null;
					$tr.append($('<td />').html('&#x2717;').css('color', 'red'));
					return;
				}
				if(('modifiers' in method.common) && ('parameters' in method.common)) {
					$tr.append($('<td />').html('&#x2713;').css('color', 'green'));
					previousSpecial = null;
					return;
				}
				var availability = method.availability[versions[i]];
				if(previousSpecial && (previousSpecial.availability.modifiers === availability.modifiers) && (previousSpecial.availability.parameters === availability.parameters)) {
					previousSpecial.$td.prop('colspan', 1 + (previousSpecial.$td.prop('colspan') || 1));
				}
				else {
					var $td;
					$tr.append($td = $('<td class="method-flavor" />'));
					if(!('modifiers' in method.common)) {
						$td.append($('<div>Modifiers:</div>').append($('<span class="method-modifiers" />').text(availability.modifiers)));
					}
					if(!('parameters' in method.common)) {
						$td.append($('<div>Parameters:</div>').append($('<span class="method-parameters" />').text(availability.parameters)));
					}
					previousSpecial = {$td: $td, availability: availability};
				}
			});
		});
		if((!me.methods.length) && me.errors) {
			$tb.append($tr = $('<tr />').append('<th />'));
			$.each(versions, function(i) {
				$tr.append($('<td />').text(me.errors[i] ? me.errors[i] : ''));
			});
		}
	}
};
ClassMethods.loadPerVersion = function(category, className) {
	var state = {callIndex: showClass.callIndex, category: category, className: className, result: []};
	function loadNextVersion(i, cb) {
		if(state.callIndex !== showClass.callIndex) {
			return;
		}
		if(i >= versions.length) {
			cb();
			return;
		}
		$('#result>table .loading-methods-version').text(' (version ' + versions[i] + ')');
		process('list-methods', {category: state.category, className: state.className, version: versions[i]}, false, function(ok, data) {
			if(!ok) {
				state.result[i] = {error: data};
			}
			else if(data === null) {
				state.result[i] = {error: 'Empty result from server(!)'};
			}
			else {
				state.result[i] = data;
			}
			loadNextVersion(i + 1, cb);
		});
	}
	loadNextVersion(0, function() {
		var cm = new ClassMethods(state.category, state.className, state.result);
		if(state.callIndex === showClass.callIndex) {
			cm.show();
		}
	});
};
ClassMethods.loadAllVersions = function(category, className) {
	var state = {callIndex: showClass.callIndex, category: category, className: className};
	process('list-methods-alreadyparsed', {category: state.category, className: state.className}, false, function(ok, data) {
		var versionsData = [];
		$.each(versions, function(i, version) {
			if(!ok) {
				versionsData[i] = {error: data};
			}
			else if(data === null) {
				versionsData[i] = {error: 'Empty result from server(!)'};
			}
			else {
				versionsData[i] = (version in data) ? data[version] : [];
			}
		});
		var cm = new ClassMethods(state.category, state.className, versionsData);
		if(state.callIndex === showClass.callIndex) {
			cm.show();
		}
	});
};

function showClass(category, className, versionsParsed) {
	showClass.callIndex = 1 + (showClass.callIndex || 0);
	var $table, $tr, $tb;
	$('#result')
		.empty()
		.append($table = $('<table class="table table-bordered table-striped table-hover result-classes" />')
			.append($('<thead />')
				.append($tr = $('<tr />')
					.append('<th />')
				)
			)
		)
	;
	$.each(versions, function(_, version) {
		$tr.append($('<th />').text(version));
	});
	$table
		.append($tb = $('<tbody />')
			.append($tr = $('<tr />')
				.append($('<th class="class-name" />').text('class ' + className))
			)
		)
	;
	$.each(classes[category].list, function(_, list) {
		if(list.className !== className) {
			return;
		}
		$.each(versions, function(_, version) {
			var $td;
			$tr.append($td = $('<td />'));
			if(version in list.availability) {
				$td.html('&#x2713;').css('color', 'green').attr('title', classes[category].loader.replace('%s', list.availability[version]));
			}
			else {
				$td.html('&#x2717;').css('color', 'red');
			}
		});
		return false;
	});
	$('#result').show();
	if(!(category in methodsCache)) {
		methodsCache[category] = {};
	}
	if(className in methodsCache[category]) {
		methodsCache[category][className].show();
		return;
	}
	$table.append($('<tfoot />')
		.append('<tr><td colspan="' + (1 + versions.length) + '">Loading methods<span class="loading-methods-version"></span>...</td></tr>')
	);
	if(versionsParsed) {
		ClassMethods.loadAllVersions(category, className);
	}
	else {
		ClassMethods.loadPerVersion(category, className);
	}
}

function showFlat(key) {
	var $table, $tr, $tb;
	$('#result')
		.empty()
		.append($table = $('<table class="table table-bordered table-striped table-hover result-classes" />')
			.append($('<thead />')
				.append($tr = $('<tr />')
					.append('<th />')
				)
			)
			.append($tb = $('<tbody />'))
		)
	;
	$.each(versions, function(_, version) {
		$tr.append($('<th />').text(version));
	});
	var list = [];
	var sameName;
	if(key === 'constants') {
		sameName = function(a, b) {
			return a === b;
		};
	}
	else {
		sameName = function(a, b) {
			return a.toLowerCase() === b.toLowerCase();
		};
	}
	var fnTester = function(f) { return true; };
	switch(key) {
		case 'functions':
			if(!($('#options-flat-' + key + '-3rdparty').is(':checked'))) {
				fnTester = function(f) {
					if(f.file && /^concrete\/libraries\/3rdparty\//i.test(f.file)) {
						return false;
					}
					return true;
				}
			}
			break;
		case 'constants':
			fnTester = function(f) {
				var b;
				if(fnTester.onlyAlways && !f.always) {
					return false;
				}
				if(fnTester.skip3rdparty && f.definitions) {
					b = null;
					$.each(f.definitions, function(l) {
						if(/^concrete\/libraries\/3rdparty\//i.test(this.file)) {
							b = false;
						}
						else {
							b = true;
							return false;
						}
					});
					if(b === false) {
						return false;
					}
				}
				return true;
			};
			fnTester.skip3rdparty = !($('#options-flat-' + key + '-3rdparty').is(':checked'));
			fnTester.onlyAlways = !($('#options-flat-' + key + '-notalways').is(':checked'));
			break;
	}
	$.each(flat[key], function(version, defs) {
		$.each(defs, function(_, f) {
			if(!fnTester(f)) {
				return;
			}
			var index = -1;
			$.each(list, function(i) {
				if(sameName(this.name, f.name)) {
					index = i;
					return false;
				}
			});
			if(index < 0) {
				index = list.length;
				list.push({name: f.name, availability: []});
			}
			var F = $.extend(true, {}, f);
			delete F.name;
			list[index].availability[$.inArray(version, versions)] = F;
		});
	});
	list.sort(function(a, b) {
		var sa = a.name.toLowerCase(), sb = b.name.toLowerCase();
		if(sa < sb) {
			return -1;
		}
		if(sa > sb) {
			return 1;
		}
		return 0;
	});
	$.each(list, function() {
		var common = null;
		$.each(this.availability, function(_, a) {
			if(!a) {
				return;
			}
			if(!common) {
				common = $.extend(true, {}, a);
				return;
			}
			if('parameters' in common) {
				if(common.parameters !== a.parameters) {
					delete common.parameters;
				}
			}
		});
		var $tr, $td;
		$tb.append($tr = $('<tr />')
			.append($td = $('<th class="method-name" />').text(this.name))
		);
		if('parameters' in common) {
			$td.append($('<span class="method-parameters" />').text('(' + (common.parameters ? common.parameters : '') + ')'));
		}
		if('file' in common) {
			$td.attr('title', common.file);
		}
		var previousSpecial = null;
		$.each(this.availability, function(_, a) {
			if(!a) {
				previousSpecial = null;
				$tr.append($('<td />').html('&#x2717;').css('color', 'red'));
				return;
			}
			if(
				(('parameters' in a) && ('parameters' in common)) ||
				((!('parameters' in a)) && (!('parameters' in common)))
			) {
				$tr.append($('<td />').html('&#x2713;').css('color', 'green'));
				previousSpecial = null;
				return;
			}
			if(previousSpecial && (previousSpecial.availability.parameters === a.parameters)) {
				previousSpecial.$td.prop('colspan', 1 + (previousSpecial.$td.prop('colspan') || 1));
			}
			else {
				var $td;
				$tr.append($td = $('<td class="method-flavor" />'));
				if(!('parameters' in method.common)) {
					$td.append($('<div>Parameters:</div>').append($('<span class="method-parameters" />').text(availability.parameters)));
				}
				previousSpecial = {$td: $td, availability: availability};
			}
		});
	});
	$('#result').show();
}
*/
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
		function processNextType(typeIndex, cb) {
			if(typeIndex >= Type.all.length) {
				cb();
				return;
			}
			var type = Type.all[typeIndex];
			var loadParsed = [], loadToBeParsed = [];
			$.each(Version.all, function(_, version) {
				if(version[type.handleMulti + 'Parsed']) {
					if(!storage.has(type.handleMulti + '::' + version.code)) {
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
							action = 'get-parsed-' + type.handleMulti;
						}
						process(action, load.data, false, function(ok, result) {
							if(!ok) {
								setWorking(false);
								alert(result);
								return;
							}
							for(var version in result) {
								storage.set(type.handleMulti + '::' + version, result[version]);
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
							action = 'get-version-' + type.handleMulti;
						}
						process(action, load.data, false, function(ok, result) {
							if(!ok) {
								setWorking(false);
								alert(result);
								return;
							}
							storage.set(type.handleMulti + '::' + load.data.version, result);
							loadNext(loadIndex + 1);
						});
						break;
				}
			}
			loadNext(0);
		}
		processNextType(0, function() {
			debugger;
		});
		return;
		if('functions' in result) {
			flat.functions = result.functions;
		}
		if('constants' in result) {
			flat.constants = result.constants;
		}
		var defs = [
			{waitText: 'Listing helpers...', optionsText: 'Helpers', handler: 'classes', key: 'helper', labelText: 'Helper', placeholder: 'Choose a helper...', loader: 'Loader::helper(\'%s\')'},
			{waitText: 'Listing libraries...', optionsText: 'Libraries', handler: 'classes', key: 'library', labelText: 'Library', placeholder: 'Choose a library...', loader: 'Loader::library(\'%s\')'},
			{waitText: 'Listing models...', optionsText: 'Models', handler: 'classes', key: 'model', labelText: 'Model', placeholder: 'Choose a model...', loader: 'Loader::model(\'%s\')'},
			{waitText: 'Listing functions...', optionsText: 'Global functions', handler: 'flat', key: 'functions', action: 'list-functions'},
			{waitText: 'Listing constants...', optionsText: 'Constants', handler: 'flat', key: 'constants', action: 'list-constants'}
		];
		function addOption(def, onActivated) {
			$('#options-operations').append($('<label class="radio-inline" />')
				.text(def.optionsText)
				.prepend($('<input type="radio" name="options-operation" />')
					.on('change', function() {
						if(!this.checked) {
							return;
						}
						$('#result').hide().empty();
						$('.options-specific').hide();
						$('.options-specific-' + def.key).show();
						if(onActivated) {
							onActivated();
						}
					})
				)
			);
		}
		function loadNext(i, cb) {
			if(i >= defs.length) {
				cb();
				return;
			}
			var def = defs[i];
			switch(def.handler) {
				case 'classes':
					setWorking(def.waitText);
					process('list-classes', {category: def.key}, false, function(ok, result) {
						if(!ok) {
							setWorking(false);
							alert(result);
							return;
						}
						addOption(def);
						classes[def.key] = {loader: def.loader, list: result};
						var $s, $l;
						$('#options-form').append($l = $('<div class="form-group options-specific options-specific-' + def.key + '" />')
							.append($('<label for="options-class-' + def.key + '" class="col-sm-2 control-label" />').text(def.labelText))
							.append($('<div class="col-sm-10" />')
								.append($s = $('<select id="options-class-' + def.key + '"><option value="" selected></option></select>')
									.data('category', def.key)
									.data('placeholder', def.placeholder)
								)
							)
						);
						$.each(result, function() {
							$s.append($('<option />')
								.data('classInfo', this)
								.text(this.className)
							);
						});
						$s
							.chosen({width: '100%'})
							.on('change', function() {
								var $me = $(this);
								$('#result').hide().empty();
								var classInfo = $me.find('option:selected').data('classInfo');
								if(classInfo) {
									showClass($me.data('category'), classInfo.className, classInfo.methodsParsed);
								}
							})
						;
						$l.hide();
						loadNext(i + 1, cb);
					});
					break;
				case 'flat':
					addOption(def, function() {
						var $m;
						if(def.key in flat) {
							showFlat(def.key);
							return;
						}
						setWorking(def.waitText);
						$('#result').empty().show().append($m = $('<div class="alert alert-info" />').html());
						var loaded = {};
						function nextVersion(i, cb) {
							if(i >= versions.length) {
								cb();
								return;
							}
							process(def.action, {version: versions[i]}, false, function(ok, result) {
								if(!ok) {
									setWorking(false);
									alert(result);
									return;
								}
								if(result && result.length) {
									loaded[versions[i]] = result;
								}
								nextVersion(i + 1, cb);
							});
						}
						nextVersion(0, function() {
							setWorking(false);
							flat[def.key] = loaded;
							showFlat(def.key);
							return;
						});
					});
					switch(def.key) {
						case 'functions':
							$('#options-form').append($('<div class="form-group options-specific options-specific-' + def.key + '" />')
								.hide()
								.append($('<label for="options-flat-' + def.key + '-3rdparty" class="col-sm-2 control-label" />').text('Show 3rd party functions'))
								.append($('<div class="col-sm-10" />')
									.append($('<input type="checkbox" id="options-flat-' + def.key + '-3rdparty" />')
										.on('change', function() {
											showFlat(def.key);
										})
									)
								)
							);
							break;
						case 'constants':
							$('#options-form')
								.append($('<div class="form-group options-specific options-specific-' + def.key + '" />')
									.hide()
									.append($('<label for="options-flat-' + def.key + '-3rdparty" class="col-sm-2 control-label" />').text('Show 3rd party constants'))
									.append($('<div class="col-sm-10" />')
										.append($('<input type="checkbox" id="options-flat-' + def.key + '-3rdparty" />')
											.on('change', function() {
												showFlat(def.key);
											})
										)
									)
								)
								.append($('<div class="form-group options-specific options-specific-' + def.key + '" />')
									.hide()
									.append($('<label for="options-flat-' + def.key + '-notalways" class="col-sm-2 control-label" />').text('Show constants that may not be always defined'))
									.append($('<div class="col-sm-10" />')
										.append($('<input type="checkbox" id="options-flat-' + def.key + '-notalways" />')
											.on('change', function() {
												showFlat(def.key);
											})
										)
									)
								)
							;
							break;
					}
					loadNext(i + 1, cb);
					break;
			}
		}
		loadNext(0, function() {
			setWorking(false);
			$('#options').removeClass('hide');
		});
	});
});

})();
