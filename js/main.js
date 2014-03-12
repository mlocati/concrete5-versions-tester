(function(undefined) {
"use strict";
var viewer = null;

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
				if(viewer) {
					viewer.view();
				}
			});
			$('.hide-until-ready').show();
			setWorking();
		});
	});
});

})();
