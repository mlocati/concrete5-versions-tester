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
			_C5VT_::checkSchema();
			$versions = _C5VT_::getVersions();
			$result = array('versions' => $versions);
			$loaded = array();
			$rs = _C5VT_::query('select flVersion from _C5VT_FunctionsLoaded');
			while($row = $rs->fetch_assoc()) {
				$loaded[] = $row['flVersion'];
			}
			$rs->close();
			if(count(array_diff($versions, $loaded)) === 0) {
				$result['functions'] = _C5VT_::getFunctions(true);
			}
			$loaded = array();
			$rs = _C5VT_::query('select clVersion from _C5VT_ConstantsLoaded');
			while($row = $rs->fetch_assoc()) {
				$loaded[] = $row['clVersion'];
			}
			$rs->close();
			if(count(array_diff($versions, $loaded)) === 0) {
				$result['constants'] = _C5VT_::getConstants(true);
			}
			break;
		case 'list-classes':
			$result = _C5VT_::getClasses(_C5VT_::getString('category'));
			break;
		case 'list-methods':
			$result = _C5VT_::getMethods(_C5VT_::getString('version'), _C5VT_::getString('category'), _C5VT_::getString('className'));
			break;
		case 'list-methods-alreadyparsed':
			$result = _C5VT_::getMethods(true, _C5VT_::getString('category'), _C5VT_::getString('className'));
			break;
		case 'list-functions':
			$result = _C5VT_::getFunctions(_C5VT_::getString('version'));
			break;
		case 'list-constants':
			$result = _C5VT_::getConstants(_C5VT_::getString('version'));
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
	const SCHEMA_VERSION = '1.1';
	const CLASSCATEGORY_HELPER = 'helper';
	const CLASSCATEGORY_LIBRARY = 'library';
	const CLASSCATEGORY_MODEL = 'model';
	private static function getCategoryFolderName($category) {
		switch($category) {
			case self::CLASSCATEGORY_HELPER:
				return 'helpers';
			case self::CLASSCATEGORY_LIBRARY:
				return 'libraries';
			case self::CLASSCATEGORY_MODEL:
				return 'models';
		}
		throw new Exception("Invalid class category: $category");
	}
	public static function checkSchema() {
		$versions = implode(',', self::getVersions());
		if(
			(self::SCHEMA_VERSION === self::getConfig('schemaVersion'))
			&&
			$versions === self::getConfig('concrete5Versions')
		) {
			return;
		}
		self::query('delete from _C5VT_Class');
		self::query('delete from _C5VT_FunctionsLoaded');
		self::query('delete from _C5VT_ConstantsLoaded');
		self::setConfig('schemaVersion', self::SCHEMA_VERSION);
		self::setConfig('concrete5Versions', $versions);
	}
	public static function getString($name, $onNotFound = '') {
		return (isset($_GET) && is_array($_GET) && array_key_exists($name, $_GET) && is_string($_GET[$name])) ? $_GET[$name] : $onNotFound;
	}
	/** @return mysqli */
	public static function getConnection() {
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
			throw new Exception('Query failed at line ' . __LINE__ . ":\n" . $sql);
		}
		return $rs;
	}
	private static function escape($str) {
		return "'" . self::getConnection()->real_escape_string($str) . "'";
	}
	public static function getConfig($key, $onNotFound = null) {
		if(!(is_string($key) && strlen($key))) {
			throw new Exception('Bad $key in ' . __FUNCTION__);
		}
		$mi = self::getConnection();
		$rs = self::query('select cValue from _C5VT_Config where cKey = ' . self::escape($key));
		$row = $rs->fetch_assoc();
		$rs->close();
		if($row) {
			$js = $row['cValue'];
			if($js === 'null') {
				return null;
			}
			$value = @json_decode($js, true);
			if(!is_null($value)) {
				return $value;
			}
		}
		return $onNotFound;
	}
	public static function setConfig($key, $value) {
		if(!(is_string($key) && strlen($key))) {
			throw new Exception('Bad $key in ' . __FUNCTION__);
		}
		if(is_null($value)) {
			$js = 'null';
		}
		else {
			$js = @json_encode($value);
			if($js === false) {
				throw new Exception('Bad $value in ' . __FUNCTION__);
			}
		}
		self::query('
			insert into _C5VT_Config
				set
					cKey = ' . self::escape($key) . ',
					cValue = ' . self::escape($js) . '
				on duplicate key update
					cValue = ' . self::escape($js) . '
		');
		return $onNotFound;
	}
	public static function launchConcrete5($version) {
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
		define('CONFIG_FILE', realpath(dirname(__FILE__) . '/includes/configuration.runtime.php1'));
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
	public static function getClasses($category) {
		switch(is_string($category) ? $category : '') {
			case self::CLASSCATEGORY_HELPER:
			case self::CLASSCATEGORY_LIBRARY:
			case self::CLASSCATEGORY_MODEL:
				break;
			default:
				throw new Exception("Invalid category: '$category'");
		}
		$rs = self::query('
			select
				*
			from
				_C5VT_Class
				left join _C5VT_ClassAvailability on _C5VT_Class.cId = _C5VT_ClassAvailability.caClass
			where
				cCategory = ' . self::escape($category) . '
			order by
				cName
		', true);
		$curID = null;
		$result = array();
		while ($row = $rs->fetch_assoc()) {
			if((!$curID) || ($curID !== $row['cId'])) {
				$index = count($result);
				$result[] = array('className' => $row['cName'], 'availability' => array(), 'methodsParsed' => empty($row['caMethodsParsed']) ? false : true);
				$curID = $row['cId'];
			}
			if(is_string($row['caVersion']) && strlen($row['caVersion'])) {
				$result[$index]['availability'][$row['caVersion']] = $row['caPlace'];
			}
		}
		$rs->close();
		if(count($result) > 0) {
			return $result;
		}
		$versions = _C5VT_::getVersions();
		set_time_limit(180);
		$result = array();
		foreach($versions as $version) {
			self::getClassesLister($result, $version, $category, _C5VT_VERSIONS_FOLDER . "/$version/concrete/" . self::getCategoryFolderName($category), '');
		}
		ksort($result);
		$result = array_values($result);
		$mi = self::getConnection();
		if(!(@$mi->autocommit(false))) {
			throw new Exception('Transaction failed to start at line ' . __LINE__);
		}
		try {
			foreach($result as $r1) {
				self::query('insert into _C5VT_Class set cCategory = ' . self::escape($category) . ', cName = ' . self::escape($r1['className']));
				$cId = $mi->insert_id;
				$subs = array();
				foreach($r1['availability'] as $v => $p) {
					$subs[] = '(' . $cId . ', ' . self::escape($v) . ', ' . self::escape($p) . ')';
				}
				if(count($subs)) {
					self::query('insert into _C5VT_ClassAvailability (caClass, caVersion, caPlace) values ' . implode(', ', $subs));
				}
			}
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
	private static function getClassesLister(&$result, $version, $category, $folderAbs, $folderRel) {
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
					if(($category !== self::CLASSCATEGORY_LIBRARY) || ($item !== '3rdparty')) {
						$subFolders[] = $item;
					}
				}
				elseif(preg_match('/.\\.php$/i', $item)) {
					self::getClassesParser($result, $version, $itemAbs, ltrim("$folderRel/$item", '/'));
				}
			}
		}
		catch(Exception $x) {
			closedir($hDir);
			throw $x;
		}
		closedir($hDir);
		foreach($subFolders as $subFolder) {
			self::getClassesLister($result, $version, $category, "$folderAbs/$subFolder", ltrim("$folderRel/$subFolder", '/'));
		}
	}
	private static function getClassesParser(&$result, $version, $fileAbs, $fileRel) {
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
						$classNameLC = strtolower($className);
						if(!array_key_exists($classNameLC, $result)) {
							$result[$classNameLC] = array('className' => $className, 'availability' => array());
						}
						$result[$classNameLC]['availability'][$version] = preg_replace('/\\.php$/i', '', $fileRel);
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
	public static function getMethods($version, $category, $className) {
		if($version !== true) {
			if(!(is_string($version) && in_array($version, _C5VT_::getVersions()))) {
				throw new Exception("Invalid version: '$version'");
			}
		}
		switch(is_string($category) ? $category : '') {
			case self::CLASSCATEGORY_HELPER:
			case self::CLASSCATEGORY_LIBRARY:
			case self::CLASSCATEGORY_MODEL:
				break;
			default:
				throw new Exception("Invalid category: '$category'");
		}
		$classAvailability = null;
		if(is_string($className) && strlen($className)) {
			foreach(_C5VT_::getClasses($category) as $p) {
				if(strcasecmp($p['className'], $className) === 0) {
					$className = $p['className'];
					$classAvailability = $p['availability'];
					break;
				}
			}
		}
		if(is_null($classAvailability)) {
			throw new Exception("Invalid class: '$className'");
		}
		if($version === true) {
			$parentRecord = null;
		}
		else {
			$rs = self::query('select caId, caMethodsParsed from _C5VT_Class inner join _C5VT_ClassAvailability on _C5VT_Class.cId = _C5VT_ClassAvailability.caClass where cName = ' . self::escape($className) . ' and caVersion = ' . self::escape($version) . ' limit 1');
			$row = $rs->fetch_assoc();
			$rs->close();
			if(!$row) {
				return array();
			}
			$parentRecord = intval($row['caId']);
			if(empty($row['caMethodsParsed'])) {
				_C5VT_::launchConcrete5($version);
				$result = array();
				switch($category) {
					case self::CLASSCATEGORY_HELPER:
						Loader::helper($classAvailability[$version]);
						break;
					case self::CLASSCATEGORY_LIBRARY:
						Loader::library($classAvailability[$version]);
						break;
					case self::CLASSCATEGORY_MODEL:
						Loader::model($classAvailability[$version]);
						break;
				}
				foreach(get_class_methods($className) as $methodName) {
					$method = array('name' => $methodName);
					if(class_exists('ReflectionMethod', false)) {
						$reflection = new ReflectionMethod("$className::$methodName");
						$method['modifiers'] = implode(' ', Reflection::getModifierNames($reflection->getModifiers()));
						$method['parameters'] = array();
						foreach($reflection->getParameters() as $i => $p) {
							$method['parameters'][] = self::describeParameter($p);
						}
						$method['parameters'] = implode(', ', $method['parameters']);
					}
					$result[] = $method;
				}
				usort($result, function($a, $b) {
					return strcasecmp($a['name'], $b['name']);
				});
				$mi = self::getConnection();
				if(!(@$mi->autocommit(false))) {
					throw new Exception('Transaction failed to start at line ' . __LINE__);
				}
				try {
					foreach($result as $method) {
						$sql = 'insert into _C5VT_ClassMethod set cmClassAvailability = ' . $parentRecord . ', cmName = ' . self::escape($method['name']);
						if(array_key_exists('modifiers', $method)) {
							$sql .= ', cmModifiers = ' . self::escape($method['modifiers']);
						}
						if(array_key_exists('parameters', $method)) {
							$sql .= ', cmParameters = ' . self::escape($method['parameters']);
						}
						self::query($sql);
					}
					self::query('update _C5VT_ClassAvailability set caMethodsParsed = 1 where caId = ' . $parentRecord . ' limit 1');
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
		$result = array();
		if($version === true) {
			$rs = self::query('
				select
					caVersion,
					cmName,
					cmModifiers,
					cmParameters
				from
					_C5VT_Class
					inner join _C5VT_ClassAvailability on _C5VT_Class.cId = _C5VT_ClassAvailability.caClass
					inner join _C5VT_ClassMethod on _C5VT_ClassAvailability.caId = _C5VT_ClassMethod.cmClassAvailability
				where
					cName = ' . self::escape($className) . '
				order by
					caVersion,
					cmName
			', true);
		}
		else {
			$rs = self::query('
				select
					cmName,
					cmModifiers,
					cmParameters
				from
					_C5VT_ClassMethod
				where
					cmClassAvailability = ' . (is_null($parentRecord) ? 0 : $parentRecord) . '
				order by
					cmName
			', true);
		}
		while($row = $rs->fetch_assoc()) {
			$method = array('name' => $row['cmName']);
			if(!is_null($row['cmModifiers'])) {
				$method['modifiers'] = $row['cmModifiers'];
			}
			if(!is_null($row['cmParameters'])) {
				$method['parameters'] = $row['cmParameters'];
			}
			if($version === true) {
				if(!array_key_exists($row['caVersion'], $result)) {
					$result[$row['caVersion']] = array();
				}
				$result[$row['caVersion']][] = $method;
			}
			else {
				$result[] = $method;
			}
		}
		$rs->close();
		return $result;
	}
	public static function getFunctions($version) {
		if($version !== true) {
			if(!(is_string($version) && in_array($version, _C5VT_::getVersions()))) {
				throw new Exception("Invalid version: '$version'");
			}
		}
		if($version !== true) {
			$rs = self::query('select flVersion from _C5VT_FunctionsLoaded where flVersion = ' . self::escape($version) . ' limit 1');
			$row = $rs->fetch_assoc();
			$rs->close();
			if(!$row) {
				_C5VT_::launchConcrete5($version);
				$result = array();
				foreach(get_defined_functions() as $category => $functionNames) {
					if($category !== 'user') {
						continue;
					}
					natcasesort($functionNames);
					foreach($functionNames as $functionName) {
						$function = array('name' => $functionName);
						if(class_exists('ReflectionFunction', false)) {
							$reflection = new ReflectionFunction($functionName);
							$function['parameters'] = array();
							foreach($reflection->getParameters() as $i => $p) {
								$function['parameters'][] = self::describeParameter($p);
							}
							$function['parameters'] = implode(', ', $function['parameters']);
							$file = realpath($reflection->getFileName());
							if(stripos($file, DIR_BASE) === 0) {
								$file = substr($file, strlen(DIR_BASE) + 1);
							}
							$file = str_replace('\\', '/', $file);
							$function['file'] = $file;
						}
						$result[] = $function;
					}
				}
				$mi = self::getConnection();
				if(!(@$mi->autocommit(false))) {
					throw new Exception('Transaction failed to start at line ' . __LINE__);
				}
				try {
					self::query('insert into _C5VT_FunctionsLoaded set flVersion = ' . self::escape($version));
					foreach($result as $function) {
						$sql = 'insert into _C5VT_Function set fVersion = ' . self::escape($version) . ', fName = ' . self::escape($function['name']);
						if(array_key_exists('parameters', $function)) {
							$sql .= ', fParameters = ' . self::escape($function['parameters']);
						}
						if(array_key_exists('file', $function)) {
							$sql .= ', fFile = ' . self::escape($function['file']);
						}
						self::query($sql);
					}
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
		$result = array();
		if($version === true) {
			$rs = self::query('
				select
					fVersion,
					fName,
					fParameters,
					fFile
				from
					_C5VT_Function
				order by
					fVersion,
					fName
			', true);
		}
		else {
			$rs = self::query('
				select
					fName,
					fParameters,
					fFile
				from
					_C5VT_Function
				order by
					fName
				where
					fVersion = ' . self::escape($version) . '
				order by
					fName
			', true);
		}
		while($row = $rs->fetch_assoc()) {
			$function = array('name' => $row['fName']);
			if(!is_null($row['fParameters'])) {
				$function['parameters'] = $row['fParameters'];
			}
			if(!is_null($row['fFile'])) {
				$function['file'] = $row['fFile'];
			}
			if($version === true) {
				if(!array_key_exists($row['fVersion'], $result)) {
					$result[$row['fVersion']] = array();
				}
				$result[$row['fVersion']][] = $function;
			}
			else {
				$result[] = $function;
			}
		}
		$rs->close();
		return $result;
	}
	public static function getConstants($version) {
		if($version !== true) {
			if(!(is_string($version) && in_array($version, _C5VT_::getVersions()))) {
				throw new Exception("Invalid version: '$version'");
			}
		}
		if($version !== true) {
			$rs = self::query('select clVersion from _C5VT_ConstantsLoaded where clVersion = ' . self::escape($version) . ' limit 1');
			$row = $rs->fetch_assoc();
			$rs->close();
			if(!$row) {
				_C5VT_::launchConcrete5($version);
				$result = array();
				foreach(get_defined_constants(true) as $category => $constantNamesValues) {
					if($category !== 'user') {
						continue;
					}
					$constantNames = array_keys($constantNamesValues);
					natcasesort($constantNames);
					foreach($constantNames as $constantName) {
						if(strpos($constantName, '_C5VT_') !== 0) {
							$constant = array('name' => $constantName);
							$result[] = $constant;
						}
					}
				}
				$mi = self::getConnection();
				if(!(@$mi->autocommit(false))) {
					throw new Exception('Transaction failed to start at line ' . __LINE__);
				}
				try {
					self::query('insert into _C5VT_ConstantsLoaded set clVersion = ' . self::escape($version));
					foreach($result as $constant) {
						$sql = 'insert into _C5VT_Constant set cVersion = ' . self::escape($version) . ', cName = ' . self::escape($constant['name']);
						self::query($sql);
					}
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
		$result = array();
		if($version === true) {
			$rs = self::query('
				select
					cVersion,
					cName
				from
					_C5VT_Constant
				order by
					cVersion,
					cName
			', true);
		}
		else {
			$rs = self::query('
				select
					cName
				from
					_C5VT_Constant
				order by
					cName
				where
					cVersion = ' . self::escape($version) . '
				order by
					cName
			', true);
		}
		while($row = $rs->fetch_assoc()) {
			$constant = array('name' => $row['cName']);
			if($version === true) {
				if(!array_key_exists($row['cVersion'], $result)) {
					$result[$row['cVersion']] = array();
				}
				$result[$row['cVersion']][] = $constant;
			}
			else {
				$result[] = $constant;
			}
		}
		$rs->close();
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
}
