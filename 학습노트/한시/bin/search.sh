#!/bin/bash

export LC_ALL=C.ko_KR.UTF-8
export LANG=C.UTF-8


echo "Content-type: application/json"
echo ""

if [ ${#QUERY} -gt 100 ]; then
    echo "Error: Query length exceeds the limit."
    exit 1
fi

# 쿼리 파싱
QUERY=$(echo "$QUERY_STRING" | sed -n 's/^.*q=\([^&]*\).*$/\1/p' | sed 's/+/ /g')
QUERY=$(printf "%b" "${QUERY//%/\\x}")

CLEANED_QUERY=$(echo "$QUERY" | sed 's/[a-zA-Z[:punct:]]//g')

# 한글(가-힣)과 한자(一-龥)를 제외한 모든 문자 제거
CLEANED_QUERY=$(echo "$QUERY" | sed 's/[^가-힣一-龥]//g')


################################
ROOT_DIR="/home/gilai/www"
SEARCH_DIR="/home/gilai/www/학습노트/한시"
URL_PREFIX=""

echo "["
SEP=""
grep -ril --include="*.html" --exclude-dir=".trash" "$CLEANED_QUERY" "$SEARCH_DIR" | while read -r FILE; do
    FILE_URL="${FILE#"$ROOT_DIR"}"
    echo "${SEP}\"$URL_PREFIX$FILE_URL\""
    SEP=","
done
echo "]"
