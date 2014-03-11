@echo off
"C:\Program Files\MySQL\bin\mysqldump.exe" --no-defaults --host=localhost --user=root --password --skip-comments --add-drop-table --skip-allow-keywords --create-options --default-character-set=utf8 --disable-keys --no-create-db --no-data --skip-quote-names --set-charset --skip-dump-date --result-file=%~dp0dump.sql c5versionstester
