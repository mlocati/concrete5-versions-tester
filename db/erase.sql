update _C5VT_Version set vConstantsParsed = 0, vFunctionsParsed=0, vHelpersParsed=0, vLibrariesParsed=0, vModelsParsed=0;
delete from _C5VT_Method;
alter table _C5VT_Method AUTO_INCREMENT = 1;
delete from _C5VT_Class;
alter table _C5VT_Class AUTO_INCREMENT = 1;
delete from _C5VT_Function;
alter table _C5VT_Function AUTO_INCREMENT = 1;
delete from _C5VT_ConstantDefinition;
alter table _C5VT_ConstantDefinition AUTO_INCREMENT = 1;
delete from _C5VT_Constant;
alter table _C5VT_Constant AUTO_INCREMENT = 1;