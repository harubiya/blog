#!/usr/bin/env python3

import warnings
import cgi
import cgitb
import json
import re
import os

# cgi 모듈의 DeprecationWarning을 무시하도록 설정
warnings.filterwarnings("ignore", category=DeprecationWarning, module='cgi')
warnings.filterwarnings("ignore", category=DeprecationWarning, module='cgitb')

# 디버깅을 위해 에러 메시지를 웹 페이지에 출력 (운영 환경에서는 반드시 비활성화/로그 파일 리다이렉트)
#cgitb.enable()

# --- 환경 설정 ---
ROOT_DIR = "/home/gilai/www/"
URL_PREFIX = ""
QUERY_LIMIT = 100 # QUERY_STRING 전체 길이에 대한 제한

# --- 유틸리티 함수 ---
def output_json_error(message):
    """JSON 형식의 에러 메시지를 출력하고 종료합니다."""
    print("Content-Type: application/json; charset=UTF-8")
    print("") # 헤더와 본문 사이의 빈 줄
    print(json.dumps({"error": message}, ensure_ascii=False))
    exit()

# --- CGI 폼 데이터 파싱 ---
form = cgi.FieldStorage()

# QUERY_STRING 전체 길이 검증
raw_query_string = os.environ.get('QUERY_STRING', '')
if len(raw_query_string) > QUERY_LIMIT or not raw_query_string:
    output_json_error("Query empty or length exceeds the limit.")

# 'q' 파라미터 값 가져오기
query = form.getvalue('q', '')

# 't' 파라미터 값 가져오기
target = form.getvalue('t', '')

# --- 쿼리 정리 (Sanitization) ---
# CLEANED_QUERY: 한글(가-힣)과 한자(一-龥)를 제외한 모든 문자 제거
# **여기서 공백을 제거하지 않도록 수정합니다.**
# 만약 공백도 제거하고 싶다면, `[^가-힣一-龥\s]` (s는 공백문자) 또는 `[^가-힣一-龥 ]` (리터럴 공백)을 사용하세요.
cleaned_query = re.sub(r'[^가-힣一-龥 ]', '', query) # 공백을 허용하도록 수정

# CLEANED_TARGET: 영어와 '/'를 제외한 특수문자 제거 후 '/'는 유지
cleaned_target = re.sub(r'[a-zA-Z!"#$%&\'()*+,\-.:;<=>?@\[\\\]^_`{|}~]', '', target)

# CLEANED_TARGET이 비어있으면 기본값 할당
if not cleaned_target:
    cleaned_target = "학습노트/한시"

# --- 검색 디렉터리 설정 ---
SEARCH_DIR = os.path.join(ROOT_DIR, cleaned_target)

# 검색 디렉터리가 실제로 존재하는지 확인 (필수!)
if not os.path.isdir(SEARCH_DIR):
    output_json_error(f"Search directory does not exist or is not valid: {SEARCH_DIR}")

# --- HTTP 헤더 출력 ---
print("Content-Type: application/json; charset=UTF-8")
print("") # 헤더와 본문 사이의 빈 줄

# --- 파일 검색 및 JSON 출력 (Python 자체 라이브러리 사용) ---
results = []
try:
    # 검색 패턴 컴파일
    # re.escape()는 공백도 이스케이프하므로,
    # 공백을 검색하려면 re.escape()를 씌운 후, 다시 공백의 이스케이프를 제거하는 것이 한 방법입니다.
    # 하지만 더 간단하게, 일반적인 문자열 검색처럼 `in` 연산자를 사용하는 것이 더 적합할 수 있습니다.
    # `re.search`를 사용한다면 `re.escape`는 유지하되, 필요에 따라 공백 처리 방식을 고려합니다.
    # 여기서는 re.escape()로 모든 문자를 리터럴로 처리하여 정확한 구문 검색을 유도합니다.
    # "공의 세계"를 검색하면 "공의 세계"를 정확히 찾습니다.
    # re.IGNORECASE는 대소문자를 무시할 때 사용합니다. 한글/한자에는 큰 영향이 없습니다.
    search_regex = re.compile(re.escape(cleaned_query), re.UNICODE) # re.UNICODE는 파이썬 3에서 기본 동작

    # os.walk를 사용하여 디렉터리를 재귀적으로 탐색합니다.
    for dirpath, dirnames, filenames in os.walk(SEARCH_DIR):
        # --exclude-dir=".trash" 기능 구현
        if ".trash" in dirnames:
            dirnames.remove(".trash")

        for filename in filenames:
            # --include="*.html" 기능 구현
            if not filename.endswith(".html"):
                continue

            file_path = os.path.join(dirpath, filename)

            found_in_file = False
            try:
                # 파일을 UTF-8로 읽기 (오류 처리 포함)
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    file_content = f.read()

                    # 파일 내용에서 검색어 찾기
                    # re.search()는 패턴이 문자열 내에 있는지 확인합니다.
                    if search_regex.search(file_content):
                        found_in_file = True

            except IOError as e:
                # 파일 읽기 오류는 무시합니다.
                continue
            except UnicodeDecodeError as e:
                # 인코딩 오류는 무시합니다.
                continue

            if found_in_file:
                # ROOT_DIR 경로 제거 및 URL_PREFIX 추가
                if file_path.startswith(ROOT_DIR):
                    file_url = "/" + file_path[len(ROOT_DIR):]
                else:
                    file_url = file_path
                results.append(URL_PREFIX + file_url)

except Exception as e:
    output_json_error(f"An internal server error occurred during search: {str(e)}")

# 결과를 JSON 배열 형태로 출력
print(json.dumps(results, ensure_ascii=False, indent=None))
