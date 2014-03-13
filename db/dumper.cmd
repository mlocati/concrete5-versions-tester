@echo off
setlocal

if exist "C:\Program Files\MySQL\bin\mysqldump.exe" (
	set MYSQLDUMP=C:\Program Files\MySQL\bin\mysqldump.exe
) else (
	if exist "C:\Program Files\MySQL\Server\bin\mysqldump.exe" (
		set MYSQLDUMP=C:\Program Files\MySQL\Server\bin\mysqldump.exe
	) else (
		echo mysqldump not found
		goto err
	)
)
"%MYSQLDUMP%" --no-defaults --host=localhost --user=root --password --skip-comments --add-drop-table --skip-allow-keywords --create-options --default-character-set=utf8 --disable-keys --no-create-db --no-data --skip-quote-names --set-charset --skip-dump-date --result-file=%~dp0dump.sql c5versionstester
if errorlevel 1 (
	echo mysqldump failed
	goto err
)
goto done

:err
pause

:done
endlocal