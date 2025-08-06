/*
 * 제미나이가 만들고 내가 고침
 * pm2 unstartup
 * pm2 strt search.js --watch
 * pm2 startup
 * pm2 logs
*/


// 필요한 모듈들을 불러옵니다.
const express = require('express');
const cors = require('cors'); // CORS 미들웨어 불러오기
const fs = require('fs');
const path = require('path');

// Express 앱을 초기화합니다.
const app = express();
const PORT = 3000;

// 특정 출처만 허용하려면 아래와 같이 옵션을 설정합니다.
const corsOptions = {
    origin: 'http://gilai.net:2025', 
    optionsSuccessStatus: 200 // 일부 레거시 브라우저 지원을 위해
};
app.use(cors(corsOptions));

// GET 요청을 처리하는 엔드포인트를 정의합니다.
app.get('/search', async (req, res) => {
    // 쿼리 파라미터에서 'keyword'와 't'를 가져옵니다.
    const keyword = req.query.q;
    const target = req.query.t;

    // 't' 값이 없으면 기본 디렉토리를 사용합니다.
    const rootDir = '/home/gilai/www';
    const defaultDir = '/학습노트/한시/';
    let resolvedSearchPath = rootDir + defaultDir;

    switch(target) {
    case 'n': resolvedSearchPath = rootDir + '/독서노트/'; break;
    case 'd': resolvedSearchPath = rootDir + '/일기장/'; break;
    }

    // 키워드가 제공되지 않으면 오류 메시지를 반환합니다.
    if (!keyword) {
	return res.status(400).json({ error: 'Please provide a keyword in the query parameter, e.g., /search?keyword=example' });
    }

    try {
	// resolvedSearchPath가 실제로 존재하는 디렉토리인지 확인합니다.
	const stats = await fs.promises.stat(resolvedSearchPath);
	if (!stats.isDirectory()) {
	    return res.status(400).json({ error: 'The provided path is not a directory.' });
	}

	const matchingFiles = [];

	// 디렉토리와 모든 하위 디렉토리의 파일 목록을 재귀적으로 읽어옵니다.
	const files = await getFilesRecursively(resolvedSearchPath);

	// 각 파일을 순회하며 키워드가 포함되어 있는지 확인합니다.
	for (const file of files) {
	    const baseName = path.basename(file);

	    if (baseName.toLowerCase().includes(keyword.toLowerCase())) {
		matchingFiles.push(file);
	    } else {
		try {
		    const content = fs.readFileSync(file, 'utf-8');
		    if (content.toLowerCase().includes(keyword.toLowerCase())) {
			matchingFiles.push(file);
		    }
		} catch (readErr) {
		    console.error(`Error reading file ${file}: ${readErr.message}`);
		}
	    }
	}


	const cleanFiles = matchingFiles.map(file => {
	    const cleanPath = file.replace(rootDir, '');
	    return cleanPath;
	});
	
	// 검색된 파일 목록을 JSON 형식으로 반환합니다.
	res.json(cleanFiles);
    } catch (err) {
	console.error(`Error during search: ${err.message}`);
	res.status(500).json({ error: 'Internal Server Error or Directory Not Found' });
    }
});


/**
 * 하위 디렉토리까지 재귀적으로 모든 파일을 가져오는 비동기 함수
 * *.html 파일만 포함하고, .trash 디렉토리는 제외합니다.
 */
async function getFilesRecursively(dir) {
    let files = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // 디렉토리인 경우
        if (entry.isDirectory()) {
            // .trash 디렉토리는 제외합니다.
            if (entry.name !== '.trash') {
                files = files.concat(await getFilesRecursively(fullPath));
            }
        } 
        // 파일인 경우
        else {
            // .html 확장자를 가진 파일만 목록에 추가합니다.
            if (path.extname(entry.name).toLowerCase() === '.html' ||
		path.extname(entry.name).toLowerCase() === '.diary' ) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

// 서버를 시작합니다.
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
