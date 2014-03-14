
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS _C5VT_Class;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE _C5VT_Class (
  cId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  cVersion varchar(15) NOT NULL COMMENT 'Version for which the class is valid',
  cCategory enum('helper','library','model') NOT NULL COMMENT 'Class category',
  cName varchar(255) NOT NULL COMMENT 'Class name',
  cFile varchar(300) DEFAULT NULL COMMENT 'Name of the file where the class is defined (if and only if is not a 3rd party library)',
  cLine int(10) unsigned DEFAULT NULL COMMENT 'Starting line number where the class is defined (null if and only if we were not able to retrieve it)',
  cMethodsParsed tinyint(3) unsigned NOT NULL DEFAULT '0' COMMENT 'Class methods have been parsed?',
  PRIMARY KEY (cId),
  UNIQUE KEY cVersion_cCategory_cName (cVersion,cCategory,cName),
  CONSTRAINT FK__C5VT_Class__C5VT_Version FOREIGN KEY (cVersion) REFERENCES _C5VT_Version (vCode) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='List of classes for each concrete5 version';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS _C5VT_ClassDefinition;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE _C5VT_ClassDefinition (
  cdId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  cdClass int(10) unsigned NOT NULL COMMENT 'Class parent record',
  cdFile varchar(300) NOT NULL COMMENT 'Name of the file where the class is defined (only for 3rd party libraries)',
  cdLine int(10) unsigned NOT NULL COMMENT 'Line number',
  PRIMARY KEY (cdId),
  KEY FK__C5VT_ClassDefinition__C5VT_Class (cdClass),
  CONSTRAINT FK__C5VT_ClassDefinition__C5VT_Class FOREIGN KEY (cdClass) REFERENCES _C5VT_Class (cId) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Places where classess are defined';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS _C5VT_Constant;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE _C5VT_Constant (
  cId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  cVersion varchar(15) NOT NULL COMMENT 'Version for which the constant is valid',
  cName varchar(100) NOT NULL COMMENT 'Constant name',
  cAlways tinyint(3) unsigned NOT NULL COMMENT 'Constant always defined?',
  PRIMARY KEY (cId),
  UNIQUE KEY cVersion_cName (cVersion,cName),
  CONSTRAINT FK__C5VT_Constant__C5VT_Version FOREIGN KEY (cVersion) REFERENCES _C5VT_Version (vCode) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='List of constants for each concrete5 version';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS _C5VT_ConstantDefinition;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE _C5VT_ConstantDefinition (
  cdId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  cdConstant int(10) unsigned NOT NULL COMMENT 'Constant parent record',
  cdFile varchar(300) NOT NULL COMMENT 'Name of the file where the constant is defined',
  cdLine int(10) unsigned NOT NULL COMMENT 'Line number',
  PRIMARY KEY (cdId),
  KEY FK__C5VT_ConstantDefinition__C5VT_Constant (cdConstant),
  CONSTRAINT FK__C5VT_ConstantDefinition__C5VT_Constant FOREIGN KEY (cdConstant) REFERENCES _C5VT_Constant (cId) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Places where constants are defined';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS _C5VT_Function;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE _C5VT_Function (
  fId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  fVersion varchar(15) DEFAULT NULL COMMENT 'Version for which the function is valid',
  fName varchar(100) NOT NULL COMMENT 'Function name',
  fParameters varchar(500) DEFAULT NULL COMMENT 'Parameters (null if and only if we were not able to retrieve them)',
  fFile varchar(300) DEFAULT NULL COMMENT 'Name of the file where the function is defined (null if and only if we were not able to retrieve it)',
  fLineStart int(10) unsigned DEFAULT NULL COMMENT 'Starting line number where the function is defined (null if and only if we were not able to retrieve it)',
  fLineEnd int(10) unsigned DEFAULT NULL COMMENT 'Ending line number where the function is defined (null if and only if we were not able to retrieve it)',
  PRIMARY KEY (fId),
  UNIQUE KEY fVersion_fName (fVersion,fName),
  CONSTRAINT FK__C5VT_Function__C5VT_Version FOREIGN KEY (fVersion) REFERENCES _C5VT_Version (vCode) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='List of global functions for each concrete5 version';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS _C5VT_Method;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE _C5VT_Method (
  mId int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Record identifier',
  mClass int(10) unsigned NOT NULL COMMENT 'Class parent record',
  mName varchar(100) NOT NULL COMMENT 'Method name',
  mModifiers varchar(50) DEFAULT NULL COMMENT 'Accessibility modifiers (null if and only if we were not able to retrieve them)',
  mParameters varchar(500) DEFAULT NULL COMMENT 'Parameters (null if and only if we were not able to retrieve them)',
  mFile varchar(300) DEFAULT NULL COMMENT 'Name of the file where the method is defined (null if and only if we were not able to retrieve it)',
  mLineStart int(10) unsigned DEFAULT NULL COMMENT 'Starting line number where the method is defined (null if and only if we were not able to retrieve it)',
  mLineEnd int(10) unsigned DEFAULT NULL COMMENT 'Ending line number where the method is defined (null if and only if we were not able to retrieve it)',
  PRIMARY KEY (mId),
  UNIQUE KEY mClass_mName (mClass,mName),
  CONSTRAINT FK__C5VT_Method__C5VT_Class FOREIGN KEY (mClass) REFERENCES _C5VT_Class (cId) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='List of methods for each class';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS _C5VT_Version;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE _C5VT_Version (
  vCode varchar(15) NOT NULL COMMENT 'Version code',
  vConstantsParsed tinyint(3) unsigned NOT NULL DEFAULT '0' COMMENT 'Constants: parsed?',
  vFunctionsParsed tinyint(4) unsigned NOT NULL DEFAULT '0' COMMENT 'Functions: parsed?',
  vHelpersParsed tinyint(4) unsigned NOT NULL DEFAULT '0' COMMENT 'Helpers: parsed?',
  vLibrariesParsed tinyint(4) unsigned NOT NULL DEFAULT '0' COMMENT 'Libraries: parsed?',
  vModelsParsed tinyint(4) unsigned NOT NULL DEFAULT '0' COMMENT 'Models: parsed?',
  vCodeBaseUrl varchar(150) DEFAULT NULL COMMENT 'Code base URL (example: https://github.com/concrete5/concrete5/tree/5.6.2.1/web)',
  PRIMARY KEY (vCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='List of concrete5 versions';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

