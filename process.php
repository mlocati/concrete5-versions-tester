<?php
@date_default_timezone_set(@date_default_timezone_get());

try {
	if(!is_file(dirname(__FILE__) . '/includes/configuration.php')) {
		throw new Exception("Unable to find the file includes/configuration.php\nUse includes/configuration.sample.php as a template");
	}
	require_once dirname(__FILE__) . '/includes/configuration.php';
	$action = _C5VT_::getString('action');
	$result = '';
	switch($action) {
		case 'initialize':
			$result = array(
				'schema' => _C5VT_::SCHEMA_VERSION,
				'versions' => array()
			);
			foreach(_C5VT_::getVersions() as $version) {
				$result['versions'][$version] = array(
					'constantsParsed' => false,
					'functionsParsed' => false,
					'helpersParsed' => false,
					'librariesParsed' => false,
					'modelsParsed' => false,
					'codeBaseUrl' => null
				);
			}
			$versionsInDB = array();
			$rs = _C5VT_::query('select vCode from _C5VT_Version');
			while($row = $rs->fetch_assoc()) {
				$versionsInDB[] = $row['vCode'];
			}
			$rs->close();
			foreach(array_keys($result['versions']) as $existing) {
				if(!in_array($existing, $versionsInDB)) {
					$sql = 'insert into _C5VT_Version set vCode = ' . _C5VT_::escape($existing);
					if(version_compare($existing, '5.4.2') >= 0) {
						$sql .= ', vCodeBaseUrl = ' . _C5VT_::escape("https://github.com/concrete5/concrete5/tree/$existing/web");
					}
					_C5VT_::query($sql);
				}
			}
			$rs = _C5VT_::query('select * from _C5VT_Version');
			while($row = $rs->fetch_assoc()) {
				$i = array_search($row['vCode'], $result['versions']);
				if(array_key_exists($row['vCode'], $result['versions'])) {
					if(!empty($row['vConstantsParsed'])) {
						$result['versions'][$row['vCode']]['constantsParsed'] = true;
					}
					if(!empty($row['vFunctionsParsed'])) {
						$result['versions'][$row['vCode']]['functionsParsed'] = true;
					}
					if(!empty($row['vHelpersParsed'])) {
						$result['versions'][$row['vCode']]['helpersParsed'] = true;
					}
					if(!empty($row['vLibrariesParsed'])) {
						$result['versions'][$row['vCode']]['librariesParsed'] = true;
					}
					if(!empty($row['vModelsParsed'])) {
						$result['versions'][$row['vCode']]['modelsParsed'] = true;
					}
					if(!empty($row['vCodeBaseUrl'])) {
						$result['versions'][$row['vCode']]['codeBaseUrl'] = $row['vCodeBaseUrl'];
					}
				}
			}
			$rs->close();
			break;
		case 'get-parsed-constants':
			$loadedVersions = array();
			$rs = _C5VT_::query('select vCode from _C5VT_Version where vConstantsParsed = 1');
			while($row = $rs->fetch_assoc()) {
				$loadedVersions[] = $row['vCode'];
			}
			$rs->close();
			$result = _C5VT_::getConstants(array_intersect($loadedVersions, _C5VT_::getArrayOfStrings('versions')));
			break;
		case 'get-version-constants':
			$result = _C5VT_::getConstants(_C5VT_::getString('version'));
			break;
		case 'get-parsed-functions':
			$loadedVersions = array();
			$rs = _C5VT_::query('select vCode from _C5VT_Version where vFunctionsParsed = 1');
			while($row = $rs->fetch_assoc()) {
				$loadedVersions[] = $row['vCode'];
			}
			$rs->close();
			$result = _C5VT_::getFunctions(array_intersect($loadedVersions, _C5VT_::getArrayOfStrings('versions')));
			break;
		case 'get-version-functions':
			$result = _C5VT_::getFunctions(_C5VT_::getString('version'));
			break;
		case 'get-parsed-classes':
			$category = _C5VT_::getString('category');
			$field = _C5VT_::getClassCategoryDonefieldName(_C5VT_::getString('category'));
			$loadedVersions = array();
			$rs = _C5VT_::query('select vCode from _C5VT_Version where ' . $field .' = 1');
			while($row = $rs->fetch_assoc()) {
				$loadedVersions[] = $row['vCode'];
			}
			$rs->close();
			$result = _C5VT_::getClasses($category, array_intersect($loadedVersions, _C5VT_::getArrayOfStrings('versions')));
			break;
		case 'get-version-classes':
			$result = _C5VT_::getClasses(_C5VT_::getString('category'), _C5VT_::getString('version'));
			break;
		case 'get-parsed-methods':
			$category = _C5VT_::getString('category');
			$class = _C5VT_::getString('class');
			$field = _C5VT_::getClassCategoryDonefieldName(_C5VT_::getString('category'));
			$loadedVersions = array();
			$rs = _C5VT_::query('
				select distinct
					vCode
				from
					_C5VT_Version
					inner join _C5VT_Class on _C5VT_Version.vCode = _C5VT_Class.cVersion
				where
					(cCategory = ' . _C5VT_::escape($category) . ')
					and
					(cName = ' . _C5VT_::escape($class) . ')
					and
					(' . $field .' = 1)
					and
					(cMethodsParsed = 1)
			');
			while($row = $rs->fetch_assoc()) {
				$loadedVersions[] = $row['vCode'];
			}
			$rs->close();
			$result = _C5VT_::getMethods($category, $class, array_intersect($loadedVersions, _C5VT_::getArrayOfStrings('versions')));
			break;
		case 'get-version-methods':
			$result = _C5VT_::getMethods(_C5VT_::getString('category'), _C5VT_::getString('class'), _C5VT_::getString('version'));
			break;
		case 'get-source':
			$version = _C5VT_::getString('version');
			if(!in_array($version, _C5VT_::getVersions())) {
				throw new Exception("Invalid version: '$version'");
			}
			$file = _C5VT_::getString('file');
			if(!strlen($file)) {
				throw new Exception('Missing file');
			}
			$versionFolder = realpath(_C5VT_VERSIONS_FOLDER . "/$version");
			$filePath = realpath("$versionFolder/$file");
			if((!$filePath) || (!is_file($filePath)) || (strpos($filePath, $versionFolder) !== 0)) {
				throw new Exception("Invalid file: '$file'");
			}
			$result = file_get_contents($filePath);
			if($result === false) {
				throw new Exception("Can't read file '$file'");
			}
			$result = str_replace("\r", "\n", str_replace("\r\n", "\n", $result));
			break;
		default:
			throw new Exception("Invalid action: '$action'");
	}
	_C5VT_::clearBuffer();
	header('Content-Type: application/json; charset=UTF-8', true);
	echo json_encode($result);
	die();
}
catch(Exception $x) {
	_C5VT_::clearBuffer();
	header($_SERVER['SERVER_PROTOCOL'] . ' 400 Bad Request', true, 400);
	header('Content-Type: text/plain; charset=UTF-8', true);
	echo $x->getMessage();
	die();
}

class _C5VT_ {
	const SCHEMA_VERSION = '2.0';
	const CLASSCATEGORY_HELPER = 'helper';
	const CLASSCATEGORY_LIBRARY = 'library';
	const CLASSCATEGORY_MODEL = 'model';
	private static function getClassCategoryRelativeFolder($category) {
		switch($category) {
			case self::CLASSCATEGORY_HELPER:
				return 'concrete/helpers';
			case self::CLASSCATEGORY_LIBRARY:
				return 'concrete/libraries';
			case self::CLASSCATEGORY_MODEL:
				return 'concrete/models';
		}
		throw new Exception("Invalid class category: $category");
	}
	public static function getClassCategoryDonefieldName($category) {
		switch($category) {
			case self::CLASSCATEGORY_HELPER:
				return 'vHelpersParsed';
			case self::CLASSCATEGORY_LIBRARY:
				return 'vLibrariesParsed';
			case self::CLASSCATEGORY_MODEL:
				return 'vModelsParsed';
		}
		throw new Exception("Invalid class category: $category");
	}
	public static function getString($name, $onNotFound = '') {
		return (isset($_GET) && is_array($_GET) && array_key_exists($name, $_GET) && is_string($_GET[$name])) ? $_GET[$name] : $onNotFound;
	}
	public static function getArray($name, $onNotFound = array()) {
		return (isset($_GET) && is_array($_GET) && array_key_exists($name, $_GET) && is_array($_GET[$name])) ? $_GET[$name] : $onNotFound;
	}
	public static function getArrayOfStrings($name, $onNotFound = array()) {
		$a = self::getArray($name, null);
		if(!is_array($a)) {
			return $onNotFound;
		}
		$r = array();
		foreach($a as $v) {
			if(is_string($v)) {
				$r[] = $v;
			}
		}
		return $r;
	}
	/** @return mysqli */
	private static function getConnection() {
		static $result;
		if(!isset($result)) {
			$mi = @new mysqli(_C5VT_DB_SERVER, _C5VT_DB_USERNAME, _C5VT_DB_PASSWORD, _C5VT_DB_DATABASE);
			if($mi->connect_errno) {
				throw new Exception('DB connection failed: ' . $mi->connect_error);
			}
			if(!(@$mi->set_charset('utf8'))) {
				throw new Exception('Error setting DB charset');
			}
			if(!(@$mi->autocommit(true))) {
				throw new Exception('Error setting DB autocommit');
			}
			$result = $mi;
		}
		return $result;
	}
	/**
	* @param string $sql
	* @return mysqli_result
	*/
	public static function query($sql, $unbuffered = false) {
		$rs = self::getConnection()->query($sql, $unbuffered ? MYSQLI_USE_RESULT : MYSQLI_STORE_RESULT);
		if($rs === false) {
			throw new Exception('Query failed at line ' . __LINE__ . ":\n" . self::getConnection()->error . "\n\nQuery:\n" . $sql);
		}
		return $rs;
	}
	public static function escape($str) {
		return "'" . self::getConnection()->real_escape_string($str) . "'";
	}
	private static function launchConcrete5($version) {
		$dispatcher = false;
		if(in_array($version, _C5VT_::getVersions())) {
			$dispatcher = _C5VT_VERSIONS_FOLDER . "/$version/concrete/dispatcher.php";
			if(!is_file($dispatcher)) {
				$dispatcher = false;
			}
		}
		if(!$dispatcher) {
			throw new Exception("Invalid version: '$version'");
		}
		define('DIR_BASE', realpath(_C5VT_VERSIONS_FOLDER . "/$version"));
		define('CONFIG_FILE', realpath(dirname(__FILE__) . '/includes/configuration.runtime.php'));
		define('C5_ENVIRONMENT_ONLY', true);
		require $dispatcher;
	}
	public static function clearBuffer() {
		$level = @ob_get_level();
		while(is_int($level) && ($level > 0)) {
			@ob_end_clean();
			$newLevel = @ob_get_level();
			if((!is_int($newLevel)) || ($newLevel >= $level)) {
				break;
			}
			$level = $newLevel;
		}
	}
	public static function getVersions() {
		static $result;
		if(!isset($result)) {
			$versions = array();
			if(is_dir(_C5VT_VERSIONS_FOLDER)) {
				$hDir = @opendir(_C5VT_VERSIONS_FOLDER);
				if($hDir) {
					while (($item = readdir($hDir)) !== false) {
						if(preg_match('/^\\d+(\\.\\d+)*$/', $item)) {
							if(is_dir(_C5VT_VERSIONS_FOLDER . '/' . $item)) {
								$versions[] = $item;
							}
						}
					}
					@closedir($hDir);
				}
			}
			usort($versions, function($a, $b) {
				return version_compare($a, $b);
			});
			$result = $versions;
		}
		return $result;
	}
	/**
	* @param ReflectionParameter $p
	*/
	private static function describeParameter($p) {
		$result = '';
		if($p->isPassedByReference()) {
			$result .= '&';
		}
		$result .= '$' . $p->name;
		if($p->isOptional()) {
			$result .= ' = ';
			$constant = null;
			if(method_exists($p, 'getDefaultValueConstantName')) {
				$constant = $p->getDefaultValueConstantName();
			}
			else {
				$f = $p->getDeclaringFunction();
				if(is_file($f->getFileName())) {
					$fileData = @file_get_contents($f->getFileName());
					if(is_string($fileData)) {
						$lines = explode("\n", str_replace("\r", "\n", str_replace("\r\n", "\n", $fileData)));
						$lines = array_slice($lines, $f->getStartLine() - 1, $f->getEndLine() - $f->getStartLine() + 1);
						$tokens = @token_get_all("<?php\n" . implode("\n", $lines));
						if(is_array($tokens)) {
							foreach(array_keys($tokens) as $i) if(is_array($tokens[$i])) $tokens[$i][] = token_name($tokens[$i][0]);
							$step = 0;
							$maybeConstant = '';
							foreach($tokens as $token) {
								if($step < 0) {
									break;
								}
								$kind = is_array($token) ? $token[0] : null;
								if(($kind === T_WHITESPACE) || ($kind === T_COMMENT)) {
									continue;
								}
								switch($step) {
									case 0:
										if($kind === T_FUNCTION) {
											$step = 1;
										}
										break;
									case 1:
										if(($kind === T_STRING) && (strcasecmp($token[1], $f->getName()) === 0)) {
											$step++;
										}
										else {
											$step = -1;
										}
										break;
									case 2:
										if(is_null($kind) && ($token === '(')) {
											$step++;
										}
										else {
											$step = -1;
										}
										break;
									case 3:
										if(is_null($kind) && ($token === '{')) {
											$step = -1;
										}
										if(($kind === T_VARIABLE) && ($token[1] === ('$' . $p->getName()))) {
											$step++;
										}
										break;
									case 4:
										if(is_null($kind) && ($token === '=')) {
											$step++;
										}
										else {
											$step = -1;
										}
										break;
									case 5:
										if(($kind === T_STRING) && preg_match('/^[A-Z_]\\w*$/i', $token[1])) {
											$maybeConstant .= $token[1];
											$step++;
										}
										else {
											$step = -1;
										}
										break;
									case 6:
										if($kind === T_DOUBLE_COLON) {
											$maybeConstant .= '::';
											$step--;
										}
										else {
											if(is_null($kind) && (($token === ',') || ($token === ')'))) {
												switch(strtolower($maybeConstant)) {
													case 'null':
													case 'true':
													case 'false':
														break;
													default:
														$constant = $maybeConstant;
														break;
												}
											}
											$step = -1;
										}
										break;
								}
							}
						}
					}
				}
			}
			if(is_string($constant) && strlen($constant)) {
				$result .= $constant;
			}
			else {
				$dv = $p->getDefaultValue();
				if(is_array($dv) && empty($dv)) {
					$result .= 'array()';
				}
				else {
					$result .= json_encode($dv);
				}
			}
		}
		return $result;
	}
	public static function getConstants($versions) {
		if(is_array($versions)) {
			$result = self::loadConstants(array_intersect(_C5VT_::getVersions(), $versions));
			foreach(array_keys($result) as $i) {
				uksort($result[$i], function($a, $b) {
					return strnatcasecmp($a, $b);
				});
				foreach(array_keys($result[$i]) as $j) {
					usort($result[$i][$j]['definitions'], function($a, $b) {
						$cmp = strnatcasecmp($a['file'], $b['file']);
						if($cmp != 0) {
							return $cmp;
						}
						if($a['line'] < $a['line']) {
							return -1;
						}
						if($a['line'] > $a['line']) {
							return 1;
						}
						return 0;
					});
				}
			}
			return $result;
		}
		if(!in_array($versions, _C5VT_::getVersions())) {
			throw new Exception("Invalid version: '$version'");
		}
		$rs = _C5VT_::query('select vCode from _C5VT_Version where vConstantsParsed = 1 and vCode = ' . self::escape($versions));
		$parsed = $rs->fetch_assoc();
		$rs->close();
		if($parsed) {
			$result = self::loadConstants(array($versions));
			$result = array_key_exists($versions, $result) ? $result[$versions] : array();
		}
		else {
			$result = self::parseConstants($versions);
		}
		foreach(array_keys($result) as $j) {
			usort($result[$j]['definitions'], function($a, $b) {
				$cmp = strnatcasecmp($a['file'], $b['file']);
				if($cmp != 0) {
					return $cmp;
				}
				if($a['line'] < $a['line']) {
					return -1;
				}
				if($a['line'] > $a['line']) {
					return 1;
				}
				return 0;
			});
		}
		return $result;
	}
	private static function loadConstants($versions) {
		$result = array();
		$sql = '';
		foreach($versions as $version) {
			$result[$version] = array();
			if(strlen($sql)) {
				$sql .= ' or ';
			}
			else {
				$sql = '
					select * from
						_C5VT_Constant
						left join _C5VT_ConstantDefinition on _C5VT_Constant.cId = _C5VT_ConstantDefinition.cdConstant
					where
				';
			}
			$sql .= '(cVersion = ' . _C5VT_::escape($version) . ')';
		}
		if(strlen($sql)) {
			$rs = _C5VT_::query($sql . ' order by cId');
			$lastId = null;
			while($row = $rs->fetch_array()) {
				if($lastId !== $row['cId']) {
					$lastId = $row['cId'];
					$result[$row['cVersion']][$row['cName']] = array('always' => empty($row['cAlways']) ? false : true, 'definitions' => array());
				}
				if(!empty($row['cdId'])) {
					$result[$row['cVersion']][$row['cName']]['definitions'][] = array('file' => $row['cdFile'], 'line' => intval($row['cdLine']));
				}
			}
			$rs->close();
		}
		return $result;
	}
	private static function parseConstants($version) {
		@set_time_limit(180);
		_C5VT_::launchConcrete5($version);
		$result = array();
		foreach(get_defined_constants(true) as $category => $namesValues) {
			if($category !== 'user') {
				continue;
			}
			$names = array_keys($namesValues);
			foreach($names as $name) {
				if(strpos($name, '_C5VT_') !== 0) {
					$result[$name] = array('always' => true, 'definitions' => array());
				}
			}
		}
		self::getConstantsDefinitions($result, realpath(_C5VT_VERSIONS_FOLDER . "/$version"), '');
		$mi = self::getConnection();
		if(!(@$mi->autocommit(false))) {
			throw new Exception('Transaction failed to start at line ' . __LINE__);
		}
		try {
			foreach($result as $name => $info) {
				self::query('insert into _C5VT_Constant set cVersion = ' . self::escape($version) . ', cName = ' . self::escape($name) . ', cAlways = ' . ($info['always'] ? '1' : '0'));
				$cId = @is_numeric($mi->insert_id) ? @intval($mi->insert_id) : 0;
				if($cId <= 0) {
					throw new Exception('Error saving constant');
				}
				$sql = '';
				foreach($info['definitions'] as $definition) {
					if(strlen($sql) == 0) {
						$sql = 'insert into _C5VT_ConstantDefinition (cdConstant, cdFile, cdLine) values ';
					}
					else {
						$sql .= ', ';
					}
					$sql .= '(' . self::escape($cId) . ', ' . self::escape($definition['file']) . ', ' . $definition['line'] . ')';
				}
				if(strlen($sql)) {
					self::query($sql);
				}
			}
			self::query('insert into _C5VT_Version (vCode, vConstantsParsed) values (' . self::escape($version) . ', 1) on duplicate key update vConstantsParsed = 1');
			if(!(@$mi->commit())) {
				throw new Exception('Transaction failed to commit at line ' . __LINE__);
			}
		}
		catch(Exception $x) {
			try {
				@$mi->rollback();
			}
			catch(Exception $foo) {
			}
			@$mi->autocommit(true);
			throw $x;
		}
		return $result;
	}
	private static function getConstantsDefinitions(&$constants, $folderAbs, $folderRel) {
		$subFolders = array();
		$phpFiles = array();
		$hDir = @opendir($folderAbs);
		if(!$hDir) {
			throw new Exception("Unable to open '$folderAbs'");
		}
		try {
			while(($item = readdir($hDir))) {
				if(substr($item, 0, 1) === '.') {
					continue;
				}
				$itemAbs = $folderAbs . "/$item";
				if(is_dir($itemAbs)) {
					$subFolders[] = $item;
				}
				elseif(preg_match('/.\\.php$/i', $item)) {
					self::getConstantsDefinitionsParser($constants, $itemAbs, ltrim("$folderRel/$item", '/'));
				}
			}
		}
		catch(Exception $x) {
			closedir($hDir);
			throw $x;
		}
		closedir($hDir);
		foreach($subFolders as $subFolder) {
			self::getConstantsDefinitions($constants, $folderAbs . DIRECTORY_SEPARATOR . $subFolder, ltrim("$folderRel/$subFolder", '/'));
		}
	}
	private static function getConstantsDefinitionsParser(&$constants, $fileAbs, $fileRel) {
		$phpCode = false;
		if(@is_file($fileAbs) && is_readable($fileAbs)) {
			$phpCode = @file_get_contents($fileAbs);
		}
		if($phpCode === false) {
			throw new Exception('Error reading the file ' . $fileAbs);
		}
		$tokens = token_get_all($phpCode);
		$n = count($tokens);
		$found = array();
		for($i = 0; $i < $n; $i++ ) {
			if(is_array($tokens[$i])) {
				switch($tokens[$i][0]) {
					case T_STRING:
						$text = strtolower($tokens[$i][1]);
						switch($text) {
							case 'define':
								if(($i == 0) || ( !is_array($tokens[$i - 1])) || ($tokens[$i - 1][0] != T_OBJECT_OPERATOR)) {
									$line = $tokens[$i][2];
									$j = $i + 1;
									// Skip whitespaces
									while(($j < $n) && is_array($tokens[$j] && ($tokens[$j][0] == T_WHITESPACE))) {
										$j++ ;
									}
									// Open parenthesis?
									if(($j < $n) && ($tokens[$j] === '(')) {
										$j++ ;
										// Skip whitespaces
										while(($j < $n) && is_array($tokens[$j] && ($tokens[$j][0] == T_WHITESPACE))) {
											$j++ ;
										}
										// Constant string?
										if(($j < $n) && (is_array($tokens[$j])) && ($tokens[$j][0] == T_CONSTANT_ENCAPSED_STRING) && preg_match('/^["\']\w+["\']$/', $tokens[$j][1])) {
											$name = substr($tokens[$j][1], 1, -1);
											$j++ ;
											// Skip whitespaces
											while(($j < $n) && is_array($tokens[$j] && ($tokens[$j][0] == T_WHITESPACE))) {
												$j++ ;
											}
											$add = false;
											// Comma?
											if(($j < $n) && ($tokens[$j] === ',')) {
												$i = $j + 1;
												$add = true;
											}
											if($add) {
												if( !array_key_exists($name, $found)) {
													$found[$name] = array();
												}
												$found[$name][] = array('file' => $fileRel, 'line' => $line);
											}
										}
									}
								}
								break;
							case 'config':
								if(($i < ($n - 4)) && is_array($tokens[$i + 1]) && ($tokens[$i + 1][0] == T_DOUBLE_COLON) && is_array($tokens[$i + 2]) && ($tokens[$i + 2][0] == T_STRING) && (( !strcasecmp($tokens[$i + 2][1], 'getOrDefine')) || ( !strcasecmp($tokens[$i + 2][1], 'getAndDefine')))) {
									$line = $tokens[$i][2];
									$j = $i + 3;
									// Skip whitespaces
									while(($j < $n) && is_array($tokens[$j] && ($tokens[$j][0] == T_WHITESPACE))) {
										$j++ ;
									}
									// Open parenthesis?
									if(($j < $n) && ($tokens[$j] === '(')) {
										$j++ ;
										// Skip whitespaces
										while(($j < $n) && is_array($tokens[$j] && ($tokens[$j][0] == T_WHITESPACE))) {
											$j++ ;
										}
										// Constant string?
										if(($j < $n) && (is_array($tokens[$j])) && ($tokens[$j][0] == T_CONSTANT_ENCAPSED_STRING) && preg_match('/^["\']\w+["\']$/', $tokens[$j][1])) {
											$name = substr($tokens[$j][1], 1, -1);
											$j++ ;
											// Skip whitespaces
											while(($j < $n) && is_array($tokens[$j] && ($tokens[$j][0] == T_WHITESPACE))) {
												$j++ ;
											}
											// Comma?
											if(($j < $n) && ($tokens[$j] === ',')) {
												$i = $j + 1;
												if(!array_key_exists($name, $found)) {
													$found[$name] = array();
												}
												$found[$name][] = array('file' => $fileRel, 'line' => $line);
											}
										}
									}
								}
								break;
						}
						break;
				}
			}
		}
		if(empty($found)) {
			return;
		}
		foreach($found as $name => $definitions) {
			$add = true;
			if(array_key_exists($name, $constants)) {
				$constants[$name]['definitions'] = array_merge($constants[$name]['definitions'], $definitions);
			}
			else {
				$constants[$name] = array('always' => false, 'definitions' => $definitions);
			}
		}
	}
	public static function getFunctions($versions) {
		if(is_array($versions)) {
			$result = self::loadFunctions(array_intersect(_C5VT_::getVersions(), $versions));
			foreach(array_keys($result) as $i) {
				uksort($result[$i], function($a, $b) {
					return strnatcasecmp($a, $b);
				});
			}
			return $result;
		}
		if(!in_array($versions, _C5VT_::getVersions())) {
			throw new Exception("Invalid version: '$version'");
		}
		$rs = _C5VT_::query('select vCode from _C5VT_Version where vFunctionsParsed = 1 and vCode = ' . self::escape($versions));
		$parsed = $rs->fetch_assoc();
		$rs->close();
		if($parsed) {
			$result = self::loadFunctions(array($versions));
			$result = array_key_exists($versions, $result) ? $result[$versions] : array();
		}
		else {
			$result = self::parseFunctions($versions);
		}
		uksort($result, function($a, $b) {
			return strnatcasecmp($a, $b);
		});
		return $result;
	}
	private static function loadFunctions($versions) {
		$result = array();
		$sql = '';
		foreach($versions as $version) {
			$result[$version] = array();
			if(strlen($sql)) {
				$sql .= ' or ';
			}
			else {
				$sql = '
					select * from
						_C5VT_Function
					where
				';
			}
			$sql .= '(fVersion = ' . _C5VT_::escape($version) . ')';
		}
		if(strlen($sql)) {
			$rs = _C5VT_::query($sql);
			while($row = $rs->fetch_array()) {
				$d = array();
				if(is_string($row['fParameters'])) {
					$d['parameters'] = $row['fParameters'];
				}
				if(is_string($row['fFile']) && strlen($row['fFile'])) {
					$d['file'] = $row['fFile'];
				}
				if(!(empty($row['fLineStart']) || empty($row['fLineEnd']))) {
					$d['lineStart'] = intval($row['fLineStart']);
					$d['lineEnd'] = intval($row['fLineEnd']);
				}
				$result[$row['fVersion']][$row['fName']] = $d;
			}
			$rs->close();
		}
		return $result;
	}
	private static function parseFunctions($version) {
		@set_time_limit(180);
		_C5VT_::launchConcrete5($version);
		$result = array();
		foreach(get_defined_functions() as $category => $names) {
			if($category !== 'user') {
				continue;
			}
			foreach($names as $name) {
				$info = array();
				if(class_exists('ReflectionFunction', false)) {
					$reflection = new ReflectionFunction($name);
					$info['parameters'] = array();
					foreach($reflection->getParameters() as $i => $p) {
						$info['parameters'][] = self::describeParameter($p);
					}
					$info['parameters'] = implode(', ', $info['parameters']);
					$file = realpath($reflection->getFileName());
					if(stripos($file, DIR_BASE) === 0) {
						$file = substr($file, strlen(DIR_BASE) + 1);
						$file = str_replace('\\', '/', $file);
						$info['file'] = $file;
						$start = is_numeric($reflection->getStartLine()) ? @intval($reflection->getStartLine()) : -1;
						$end = is_numeric($reflection->getEndLine()) ? @intval($reflection->getEndLine()) : -1;
						if(($start > 0) && ($end > 0)) {
							$info['lineStart'] = $start;
							$info['lineEnd'] = $end;
						}
					}
				}
				$result[$name] = $info;
			}
			$mi = self::getConnection();
			if(!(@$mi->autocommit(false))) {
				throw new Exception('Transaction failed to start at line ' . __LINE__);
			}
			try {
				foreach($result as $name => $info) {
					$sql = 'insert into _C5VT_Function set fVersion = ' . self::escape($version) . ', fName = ' . self::escape($name);
					if(array_key_exists('parameters', $info)) {
						$sql .= ', fParameters = ' . self::escape($info['parameters']);
					}
					if(array_key_exists('file', $info)) {
						$sql .= ', fFile = ' . self::escape($info['file']);
						if(array_key_exists('lineStart', $info) && array_key_exists('lineEnd', $info)) {
							$sql .= ', fLineStart = ' . $info['lineStart'] . ', fLineEnd = ' . $info['lineEnd'];
						}
					}
					self::query($sql);
				}
				self::query('insert into _C5VT_Version (vCode, vFunctionsParsed) values (' . self::escape($version) . ', 1) on duplicate key update vFunctionsParsed = 1');
				if(!(@$mi->commit())) {
					throw new Exception('Transaction failed to commit at line ' . __LINE__);
				}
			}
			catch(Exception $x) {
				try {
					@$mi->rollback();
				}
				catch(Exception $foo) {
				}
				@$mi->autocommit(true);
				throw $x;
			}
			return $result;
		}
	}
	public static function getClasses($category, $versions) {
		if(is_array($versions)) {
			$result = self::loadClasses($category, array_intersect(_C5VT_::getVersions(), $versions));
			foreach(array_keys($result) as $i) {
				uksort($result[$i], function($a, $b) {
					return strnatcasecmp($a, $b);
				});
			}
			return $result;
		}
		if(!in_array($versions, _C5VT_::getVersions())) {
			throw new Exception("Invalid version: '$version'");
		}
		$field = _C5VT_::getClassCategoryDonefieldName($category);
		$rs = _C5VT_::query('select vCode from _C5VT_Version where ' . $field . ' = 1 and vCode = ' . self::escape($versions));
		$parsed = $rs->fetch_assoc();
		$rs->close();
		if($parsed) {
			$result = self::loadClasses($category, array($versions));
			$result = array_key_exists($versions, $result) ? $result[$versions] : array();
		}
		else {
			$result = self::parseClasses($category, $versions);
		}
		uksort($result, function($a, $b) {
			return strnatcasecmp($a, $b);
		});
		return $result;
	}
	private static function loadClasses($category, $versions) {
		$result = array();
		$sql = '';
		foreach($versions as $version) {
			$result[$version] = array();
			if(strlen($sql)) {
				$sql .= ' or ';
			}
			else {
				$sql = '
					select * from
						_C5VT_Class
						left join _C5VT_ClassDefinition on _C5VT_Class.cId = _C5VT_ClassDefinition.cdClass
					where
						(cCategory = ' . _C5VT_::escape($category) . ')
						and (
				';
			}
			$sql .= '(cVersion = ' . _C5VT_::escape($version) . ')';
		}
		if(strlen($sql)) {
			$sql .= ')';
			$rs = _C5VT_::query($sql . ' order by cId');
			$lastId = null;
			while($row = $rs->fetch_array()) {
				if($lastId !== $row['cId']) {
					$lastId = $row['cId'];
					$d = array('methodsParsed' => empty($row['cMethodsParsed']) ? false : true, 'definitions' => array());
					if(!empty($row['cFile'])) {
						$d['file'] = $row['cFile'];
						if(!empty($row['cLine'])) {
							$d['line'] = intval($row['cLine']);
						}
					}
					$result[$row['cVersion']][$row['cName']] = $d;
				}
				if(!empty($row['cdId'])) {
					$result[$row['cVersion']][$row['cName']]['definitions'][] = array('file' => $row['cdFile'], 'line' => intval($row['cdLine']));
				}
			}
			$rs->close();
		}
		return $result;
	}
	private static function parseClasses($category, $version) {
		@set_time_limit(180);
		_C5VT_::launchConcrete5($version);
		$result = array();
		self::parseClassesLister($result, $category, _C5VT_VERSIONS_FOLDER . "/$version/" . self::getClassCategoryRelativeFolder($category), self::getClassCategoryRelativeFolder($category));
		$doneField = _C5VT_::getClassCategoryDonefieldName($category);
		$mi = self::getConnection();
		if(!(@$mi->autocommit(false))) {
			throw new Exception('Transaction failed to start at line ' . __LINE__);
		}
		try {
			foreach($result as $class => $info) {
				$sql = 'insert into _C5VT_Class set cVersion = ' . self::escape($version) . ', cCategory = ' . self::escape($category) . ', cName = ' . self::escape($class);
				if(array_key_exists('file', $info)) {
					$sql .= ', cFile = ' . self::escape($info['file']);
					if(array_key_exists('line', $info)) {
						$sql .= ', cLine = ' . $info['line'];
					}
				}
				$sql .= ', cMethodsParsed = 0';
				self::query($sql);
				$cId = @is_numeric($mi->insert_id) ? @intval($mi->insert_id) : 0;
				if($cId <= 0) {
					throw new Exception('Error saving class');
				}
				$sql = '';
				foreach($info['definitions'] as $definition) {
					if(strlen($sql) == 0) {
						$sql = 'insert into _C5VT_ClassDefinition (cdClass, cdFile, cdLine) values ';
					}
					else {
						$sql .= ', ';
					}
					$sql .= '(' . self::escape($cId) . ', ' . self::escape($definition['file']) . ', ' . $definition['line'] . ')';
				}
				if(strlen($sql)) {
					self::query($sql);
				}
			}
			self::query('insert into _C5VT_Version (vCode, ' . $doneField . ') values (' . self::escape($version) . ', 1) on duplicate key update ' . $doneField . ' = 1');
			if(!(@$mi->commit())) {
				throw new Exception('Transaction failed to commit at line ' . __LINE__);
			}
		}
		catch(Exception $x) {
			try {
				@$mi->rollback();
			}
			catch(Exception $foo) {
			}
			@$mi->autocommit(true);
			throw $x;
		}
		return $result;
	}
	private static function parseClassesLister(&$result, $category, $folderAbs, $folderRel) {
		$subFolders = array();
		$hDir = @opendir($folderAbs);
		if(!$hDir) {
			throw new Exception("Unable to open '$folderAbs'");
		}
		try {
			while(($item = readdir($hDir))) {
				if(substr($item, 0, 1) === '.') {
					continue;
				}
				$itemAbs = $folderAbs . "/$item";
				if(is_dir($itemAbs)) {
					$subFolders[] = $item;
				}
				elseif(preg_match('/.\\.php$/i', $item)) {
					self::parseClassesAnalyzer($result, $itemAbs, ltrim("$folderRel/$item", '/'));
				}
			}
		}
		catch(Exception $x) {
			closedir($hDir);
			throw $x;
		}
		closedir($hDir);
		foreach($subFolders as $subFolder) {
			self::parseClassesLister($result, $category, "$folderAbs/$subFolder", ltrim("$folderRel/$subFolder", '/'));
		}
	}
	private static function parseClassesAnalyzer(&$result, $fileAbs, $fileRel) {
		$fileContents = @file_get_contents($fileAbs);
		if($fileContents === false) {
			throw new Exception("Unable to get contents of '$fileAbs'");
		}
		$tokens = token_get_all($fileContents);
		$n = count($tokens);
		$classFound = false;
		for($i = 0; $i < $n; $i++) {
			$token = $tokens[$i];
			if(is_array($token) && ($token[0] === T_CLASS)) {
				if($classFound) {
					throw new Exception('Multiple consecutive T_CLASS tokens!');
				}
				$classFound = true;
			}
			elseif($classFound) {
				if(!is_array($token)) {
					throw new Exception('Expected array token after T_CLASS, found "' . $token . '"!');
				}
				switch($token[0]) {
					case T_WHITESPACE:
					case T_COMMENT:
						break;
					case T_STRING:
						$classFound = false;
						$className = $token[1];
						$line = 0;
						if(isset($token[2]) && is_numeric($token[2])) {
							$line = @intval($token[2]);
						}
						$alreadyClassName = false;
						foreach(array_keys($result) as $c) {
							if(strcasecmp($c, $className) === 0) {
								$alreadyClassName = $c;
								break;
							}
						}
						if(self::is3rdPartyPath($fileRel)) {
							$definition = array('file' => $fileRel);
							if($line > 0) {
								$definition['line'] = $line;
							}
						}
						else {
							$definition = false;
						}
						if($alreadyClassName === false) {
							$info = array('definitions' => array());
							if($definition) {
								$info['definitions'][] = $definition;
							}
							else {
								$info['file'] = $fileRel;
								if($line > 0) {
									$info['line'] = $line;
								}
							}
							$info['methodsParsed'] = false;
							$result[$className] = $info;
						}
						else {
							if($definition) {
								$result[$alreadyClassName]['definitions'][] = $definition;
							}
							else {
								$result[$alreadyClassName]['file'] = $fileRel;
								if($line > 0) {
									$result[$alreadyClassName]['line'] = $line;
								}
								else {
									unset($result[$alreadyClassName]['line']);
								}
							}
						}
						break;
					default:
						throw new Exception('Expected T_STRING token after T_CLASS, found ' . token_name($token[0]) . '!');
				}
			}
		}
		if($classFound) {
			throw new Exception('T_CLASS token found at end of file!');
		}
	}
	public static function getMethods($category, $class, $versions) {
		if(is_array($versions)) {
			$result = self::loadMethods($category, $class, array_intersect(_C5VT_::getVersions(), $versions));
			foreach(array_keys($result) as $i) {
				uksort($result[$i], function($a, $b) {
					return strnatcasecmp($a, $b);
				});
			}
			return $result;
		}
		if(!in_array($versions, _C5VT_::getVersions())) {
			throw new Exception("Invalid version: '$version'");
		}
		$field = _C5VT_::getClassCategoryDonefieldName($category);
		$rs = _C5VT_::query('
			select
				vCode,
				cMethodsParsed
			from
				_C5VT_Version
				inner join _C5VT_Class on _C5VT_Version.vCode = _C5VT_Class.cVersion
			where
				(cVersion = ' . _C5VT_::escape($versions) . ')
				and
				(cCategory = ' . _C5VT_::escape($category) . ')
				and
				(cName = ' . _C5VT_::escape($class) . ')
				and
				(' . $field .' = 1)
		');
		$row = $rs->fetch_assoc();
		$rs->close();
		if(!$row) {
			throw new Exception("Invalid class: '$class'");
		}
		if(!empty($row['cMethodsParsed'])) {
			$result = self::loadMethods($category, $class, array($versions));
			$result = array_key_exists($versions, $result) ? $result[$versions] : array();
		}
		else {
			$result = self::parseMethods($category, $class, $versions);
		}
		uksort($result, function($a, $b) {
			return strnatcasecmp($a, $b);
		});
		return $result;
	}
	private static function loadMethods($category, $class, $versions) {
		$result = array();
		$sql = '';
		foreach($versions as $version) {
			$result[$version] = array();
			if(strlen($sql)) {
				$sql .= ' or ';
			}
			else {
				$sql = '
					select
						_C5VT_Class.cVersion,
						_C5VT_Method.*
					from
						_C5VT_Class
						inner join _C5VT_Method on _C5VT_Class.cId = _C5VT_Method.mClass
					where
						(cCategory = ' . _C5VT_::escape($category) . ')
						and (cName = ' . _C5VT_::escape($class) . ')
						and (
				';
			}
			$sql .= '(cVersion = ' . _C5VT_::escape($version) . ')';
		}
		if(strlen($sql)) {
			$sql .= ')';
			$rs = _C5VT_::query($sql);
			while($row = $rs->fetch_array()) {
				$d = array();
				if(is_string($row['mModifiers'])) {
					$d['modifiers'] = $row['mModifiers'];
				}
				if(is_string($row['mParameters'])) {
					$d['parameters'] = $row['mParameters'];
				}
				if(is_string($row['mFile']) && strlen($row['mFile'])) {
					$d['file'] = $row['mFile'];
					if(!(empty($row['mLineStart']) || empty($row['mLineEnd']))) {
						$d['lineStart'] = intval($row['mLineStart']);
						$d['lineEnd'] = intval($row['mLineEnd']);
					}
				}
				$d['methodsParsed'] = empty($row['cMethodsParsed']) ? false : true;
				$result[$row['cVersion']][$row['mName']] = $d;
			}
			$rs->close();
		}
		return $result;
	}
	private static function parseMethods($category, $class, $version) {
		@set_time_limit(180);
		$rs = self::query('
			select
				cId,
				cFile
			from
				_C5VT_Class
			where
				(cVersion = ' . _C5VT_::escape($version) . ')
				and
				(cCategory = ' . _C5VT_::escape($category) . ')
				and
				(cName = ' . _C5VT_::escape($class) . ')
			limit 1
		');
		$row = $rs->fetch_assoc();
		$rs->close();
		if(!$row) {
			throw new Exception("Invalid class: '$class'");
		}
		$parentRecord = intval($row['cId']);
		_C5VT_::launchConcrete5($version);
		$result = array();
		$loadMe = substr($row['cFile'], strlen(self::getClassCategoryRelativeFolder($category)) + 1, -strlen('.php'));
		switch($category) {
			case self::CLASSCATEGORY_HELPER:
				Loader::helper($loadMe);
				break;
			case self::CLASSCATEGORY_LIBRARY:
				Loader::library($loadMe);
				break;
			case self::CLASSCATEGORY_MODEL:
				Loader::model($loadMe);
				break;
		}
		foreach(get_class_methods($class) as $method) {
			$info = array();
			if(class_exists('ReflectionMethod', false)) {
				$reflection = new ReflectionMethod("$class::$method");
				$info['modifiers'] = implode(' ', Reflection::getModifierNames($reflection->getModifiers()));
				$parameters = array();
				foreach($reflection->getParameters() as $i => $p) {
					$parameters[] = self::describeParameter($p);
				}
				$info['parameters'] = implode(', ', $parameters);
				$file = realpath($reflection->getFileName());
				if(stripos($file, DIR_BASE) === 0) {
					$file = substr($file, strlen(DIR_BASE) + 1);
					$file = str_replace('\\', '/', $file);
					$info['file'] = $file;
					$start = is_numeric($reflection->getStartLine()) ? @intval($reflection->getStartLine()) : -1;
					$end = is_numeric($reflection->getEndLine()) ? @intval($reflection->getEndLine()) : -1;
					if(($start > 0) && ($end > 0)) {
						$info['lineStart'] = $start;
						$info['lineEnd'] = $end;
					}
				}
			}
			$result[$method] = $info;
		}
		$mi = self::getConnection();
		if(!(@$mi->autocommit(false))) {
			throw new Exception('Transaction failed to start at line ' . __LINE__);
		}
		try {
			foreach($result as $method => $info) {
				$sql = 'insert into _C5VT_Method set mClass = ' . $parentRecord . ', mName = ' . self::escape($method);
				if(array_key_exists('modifiers', $info)) {
					$sql .= ', mModifiers = ' . self::escape($info['modifiers']);
				}
				if(array_key_exists('parameters', $info)) {
					$sql .= ', mParameters = ' . self::escape($info['parameters']);
				}
				if(array_key_exists('file', $info)) {
					$sql .= ', mFile = ' . self::escape($info['file']);
					if(array_key_exists('lineStart', $info) && array_key_exists('lineEnd', $info)) {
						$sql .= ', mLineStart = ' . $info['lineStart'] . ', mLineEnd = ' . $info['lineEnd'];
					}
				}
				self::query($sql);
			}
			self::query('update _C5VT_Class set cMethodsParsed = 1 where cId = ' . $parentRecord . ' limit 1');
			if(!(@$mi->commit())) {
				throw new Exception('Transaction failed to commit at line ' . __LINE__);
			}
		}
		catch(Exception $x) {
			try {
				@$mi->rollback();
			}
			catch(Exception $foo) {
			}
			@$mi->autocommit(true);
			throw $x;
		}
		return $result;
	}
	private static function is3rdPartyPath($file) {
		if(strpos($file, 'concrete/libraries/3rdparty/') === 0) {
			return true;
		}
		return false;
	}
}
