#!/bin/bash

#!/bin/bash

echo "Content-type: application/json"
echo ""

# 쿼리 파싱
QUERY=$(echo "$QUERY_STRING" | sed -n 's/^.*q=\([^&]*\).*$/\1/p' | sed 's/+/ /g')
QUERY=$(printf "%b" "${QUERY//%/\\x}")

ROOT_DIR="/home/gilai/www"
SEARCH_DIR="/home/gilai/www/학습노트/한시"
URL_PREFIX=""

echo "["
SEP=""
grep -ril --include="*.html" --exclude-dir=".trash" "$QUERY" "$SEARCH_DIR" | while read -r FILE; do
    FILE_URL="${FILE#"$ROOT_DIR"}"
    echo "${SEP}\"$URL_PREFIX$FILE_URL\""
    SEP=","
done
echo "]"
