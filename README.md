## concrete5 versions tester ##

### Tables definitions ##

```SQL
CREATE TABLE _C5VT_Class (
  cId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  cCategory enum('helper','library','model') NOT NULL COMMENT 'Class category',
  cName varchar(255) NOT NULL COMMENT 'Class name',
  PRIMARY KEY (cId),
  UNIQUE KEY cCategory_cName (cCategory,cName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Classes';

CREATE TABLE _C5VT_ClassAvailability (
  caId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  caClass int(10) unsigned NOT NULL COMMENT 'Record identifier in _C5VT_Class table',
  caVersion varchar(15) NOT NULL COMMENT 'concrete5 version',
  caPlace varchar(500) NOT NULL COMMENT 'Relative file location',
  caMethodsParsed int(10) unsigned NOT NULL DEFAULT '0' COMMENT 'Class already analyzed',
  PRIMARY KEY (caId),
  UNIQUE KEY caClass_caVersion (caClass,caVersion),
  CONSTRAINT FK__C5VT_ClassAvailability__C5VT_Class FOREIGN KEY (caClass) REFERENCES _C5VT_Class (cId) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE _C5VT_ClassMethod (
  cmId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  cmClassAvailability int(10) unsigned NOT NULL COMMENT 'Record identifier in _C5VT_ClassAvailability table',
  cmName varchar(100) NOT NULL COMMENT 'Method name',
  cmModifiers varchar(50) DEFAULT NULL COMMENT 'Accessibility modifiers (null if and only if we were not able to retrieve them)',
  cmParameters varchar(500) DEFAULT NULL COMMENT 'Parameters (null if and only if we were not able to retrieve them)',
  PRIMARY KEY (cmId),
  UNIQUE KEY cmClassAvailability_cmName (cmClassAvailability,cmName),
  CONSTRAINT FK__C5VT_ClassMethod__C5VT_ClassAvailability FOREIGN KEY (cmClassAvailability) REFERENCES _C5VT_ClassAvailability (caId) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='List of class methods for each concrete5 version';

CREATE TABLE _C5VT_Config (
  cKey varchar(50) NOT NULL COMMENT 'Configuration key',
  cValue mediumtext NOT NULL COMMENT 'Configuration value',
  PRIMARY KEY (cKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Configuration';

CREATE TABLE _C5VT_ConstantsLoaded (
  clVersion varchar(15) NOT NULL COMMENT 'Version for which constants have been loaded',
  PRIMARY KEY (clVersion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE _C5VT_Constant (
  cVersion varchar(15) NOT NULL COMMENT 'Version for which constants have been loaded',
  cName varchar(100) NOT NULL COMMENT 'Constant name',
  PRIMARY KEY (cVersion,cName),
  CONSTRAINT FK__C5VT_Constant__C5VT_ConstantsLoaded FOREIGN KEY (cVersion) REFERENCES _C5VT_ConstantsLoaded (clVersion) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Loaded constants';

CREATE TABLE _C5VT_FunctionsLoaded (
  flVersion varchar(15) NOT NULL COMMENT 'Version for which functions have been loaded',
  PRIMARY KEY (flVersion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE _C5VT_Function (
  fVersion varchar(15) NOT NULL COMMENT 'Version for which functions have been loaded',
  fName varchar(100) NOT NULL COMMENT 'Function name',
  fParameters varchar(500) DEFAULT NULL COMMENT 'Parameters (null if and only if we were not able to retrieve them)',
  fFile varchar(300) DEFAULT NULL COMMENT 'Filename where the function is defined (null if and only if we were not able to retrieve them)',
  PRIMARY KEY (fVersion,fName),
  CONSTRAINT FK__C5VT_Functions__C5VT_FunctionsLoaded FOREIGN KEY (fVersion) REFERENCES _C5VT_FunctionsLoaded (flVersion) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Loaded functions';
```