#!/bin/bash

#export LC_ALL=C.ko_KR.utf8
#export LANG=C.UTF-8


echo "Content-type: application/json"
echo ""

if [ ${#QUERY_STRING} -gt 100 ] || [ -z "$QUERY_STRING" ]; then
    echo "Error: Query empty or length exceeds the limit."
    exit 1
fi


# --- 연속 실행 방지 설정 ---
LOCK_DIR="/tmp" # 락 파일을 저장할 디렉터리 (쓰기 권한 필요)
LOCK_FILE="$LOCK_DIR/search_cgi_script.lock" # 스크립트별 고유한 파일명
WAIT_SECONDS=10 # 최소 대기 시간 (1분 = 60초)

# --- 락 파일 검사 및 갱신 ---
# 1. 락 파일이 존재하는지 확인
if [ -f "$LOCK_FILE" ]; then
    LAST_EXEC_TIME=$(cat "$LOCK_FILE")
    CURRENT_TIME=$(date +%s)
    ELAPSED_TIME=$((CURRENT_TIME - LAST_EXEC_TIME))

    if [ "$ELAPSED_TIME" -lt "$WAIT_SECONDS" ]; then
        # 1분 이내에 다시 요청됨 - 요청 거부
        echo ""
        exit 1
    fi
fi

# 2. 락 파일이 없거나 1분 이상 지났다면, 현재 시간으로 락 파일 갱신
date +%s > "$LOCK_FILE"


# 쿼리 파싱 (제미나이)
QUERY=$(echo "$QUERY_STRING" | sed -n 's/^.*q=\([^&]*\).*$/\1/p' | sed 's/+/ /g')
QUERY=$(printf "%b" "${QUERY//%/\\x}")

# TARGET_DIR 파싱 (새로운 추가)
# QUERY_STRING에서 't=' 뒤에 '&' 또는 문자열 끝까지의 문자열을 추출합니다.
TARGET=$(echo "$QUERY_STRING" | sed -n 's/^.*t=\([^&]*\).*$/\1/p' | sed 's/+/ /g')
TARGET=$(printf "%b" "${TARGET//%/\\x}")


# 한글(가-힣)과 한자(一-龥)를 제외한 모든 문자 제거
CLEANED_QUERY=$(echo "$QUERY" | sed 's/[a-zA-Z[:punct:]]//g')
CLEANED_QUERY=$(echo "$QUERY" | sed 's/[^가-힣一-龥 ]//g')

CLEANED_TARGET=$(echo "$TARGET" | sed 's/[a-zA-Z]//g')

# TARGET이 비어있으면 기본값 할당
# ${parameter:-word} 구문 사용: parameter가 null이거나 unset이면 word를 사용합니다.
CLEANED_TARGET="${CLEANED_TARGET:-학습노트/한시}"

################################
ROOT_DIR="/home/gilai/www/"
SEARCH_DIR="$ROOT_DIR$CLEANED_TARGET"
URL_PREFIX=""

echo "["
SEP=""
grep -ril --include="*.html" --exclude-dir=".trash" "$CLEANED_QUERY" "$SEARCH_DIR" | while read -r FILE; do
    FILE_URL="/${FILE#"$ROOT_DIR"}"
    echo "${SEP}\"$URL_PREFIX$FILE_URL\""
    SEP=","
done
echo "]"
