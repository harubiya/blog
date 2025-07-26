#!/bin/bash

# 사용법: ../build.sh 상대경로/파일이름.html

if [ $# -ne 1 ]; then
  echo "사용법: $0 파일이름.html"
  exit 1
fi

TARGET="$1"

if [ ! -f "$TARGET" ]; then
  echo "오류: 파일 '$TARGET' 이 존재하지 않습니다."
  exit 1
fi

# 디렉토리 분리
DIR=$(dirname "$TARGET")
BASENAME=$(basename "$TARGET")

TMPFILE=$(mktemp --tmpdir="$DIR")

# 헤더 삽입
echo "<!--#include virtual='/학습노트/inc/hanja_header.html'-->" > "$TMPFILE"

# 본문 삽입
cat "$TARGET" >> "$TMPFILE"

# 푸터 삽입
echo "<!--#include virtual='/학습노트/inc/hanja_footer.html'-->" >> "$TMPFILE"

# 원래 파일 덮어쓰기
mv "$TMPFILE" "$TARGET"

# 권한 설정
chmod 644 "$TARGET"

echo "'$TARGET' 파일에 header/footer 삽입 완료."
