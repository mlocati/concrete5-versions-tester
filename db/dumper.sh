#!/bin/sh
mysqldump --no-defaults --host=localhost --user=root --password --skip-comments --add-drop-table --skip-allow-keywords --create-options --default-character-set=utf8 --disable-keys --no-create-db --no-data --skip-quote-names --set-charset --skip-dump-date --result-file=dump.sql c5versionstester
