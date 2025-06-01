const params = new URLSearchParams(window.location.search);
let notepath = params.get("notepath");
if(!notepath) notepath = '/학습노트/추구.html';

console.log(notepath);

let processedData = [];
let currentQuizData = null;
let targetHanja = '';
let targetHanjaIndexInSentence = -1;

const hanjaExp = "\\u3040-\\u309F\\u30A0-\\u30FF\\uFF65-\\uFF9F\\u4E00-\\u9FFF";

// 오답 선택지 생성을 위한 한자 목록 (데이터에서 추출 + 기본 제공)
let allAvailableHanjaChars = "的一是了我不人在他有这个上们来到时大地为子中你说生国年着就那和要你师学温故知新药苦口行必有志竟成百闻如见千里始足下";

// --- DOM 요소 가져오기 ---
const sentenceDisplay = document.getElementById('sentence-display');
const pinyinDisplay = document.getElementById('pinyin-display');
const optionsContainer = document.getElementById('options-container');
const feedbackMessage = document.getElementById('feedback-message');

// --- 핵심 함수 ---

/**
 * 지정된 경로의 파일에서 데이터를 로드하고 파싱합니다.
 * @param {string} filePath - 데이터 파일 경로
 */
async function loadAndParseData(filePath) {
    try {
	const response = await fetch(filePath);
	if (!response.ok) {
	    throw new Error(`HTTP 오류! 상태: ${response.status}`);
	}
	const textData = await response.text();
	const lines = textData.split('\n').map(line => line.trim()).filter(line => line.length > 0);

	processedData = lines.map(line => {
	    if (line.startsWith('～')) {
		let sentence = line.substring(1).trim(); // '～' 제거 후 공백 제거
		sentence = sentence.replace(/[^\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F\u4E00-\u9FFF]/g, ''); 
		if (!sentence) return null;
		return {
		    originalLine: line,
		    sentence: sentence,
		    pinyin: "병음 정보 없음", // 이 형식은 병음이 없음
		    hanjaChars: sentence.split('')
		};
	    }
	    if(line.startsWith('=')) {
		const regex = /\=([\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F\u4E00-\u9FFF\/～\，]+)\s*([^=]*)\=/g;
		const match = regex.exec(line);
		if(match) {
		    const sentence = match[1].replace(/[^\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F\u4E00-\u9FFF]/g, ''); 
		    const pinyin = (match[2]!==undefined) ? match[2] : "병음 정보 없음";
		    //console.log(line + sentence + ':::' + pinyin);
		    return {
			originalLine: line,
			sentence: sentence,
			pinyin: pinyin,
			hanjaChars: sentence.split('')
		    };
		}
		else return null;
	    }
	    else if (line.toLowerCase().includes('<ruby')) { // <ruby> 태그 포함 여부로 판단 (간단한 체크)
		const parser = new DOMParser();
		const doc = parser.parseFromString(line, "text/html");
		const rubyElement = doc.querySelector("ruby.hanja");

		if (!rubyElement) return null;

		const rtElement = rubyElement.querySelector("rt");
		const pinyin = rtElement ? rtElement.textContent.trim() : "";

		const clone = rubyElement.cloneNode(true);
		const rtInClone = clone.querySelector('rt');
		if (rtInClone) clone.removeChild(rtInClone);
		const rpElementsInClone = clone.querySelectorAll('rp');
		rpElementsInClone.forEach(rp => clone.removeChild(rp));

		const sentence = clone.textContent.trim().replace(/\s+/g, '');
		if (!sentence) return null;

		return {
		    originalLine: line,
		    sentence: sentence,
		    pinyin: pinyin,
		    hanjaChars: sentence.split('')
		};
	    } else {
		//console.warn(`지원하지 않는 데이터 형식입니다: ${line}`);
		return null; // 지원하지 않는 형식은 건너뜀
	    }
	}).filter(item => item !== null && item.sentence && item.sentence.length > 0);

	if (processedData.length === 0) {
	    throw new Error("처리할 수 있는 유효한 데이터가 파일에 없습니다.");
	}

	// 데이터의 모든 한자를 allAvailableHanjaChars에 추가 (중복 제거)
	const uniqueCharsFromData = new Set(allAvailableHanjaChars.split(''));
	processedData.forEach(item => {
	    item.hanjaChars.forEach(char => uniqueCharsFromData.add(char));
	});
	allAvailableHanjaChars = Array.from(uniqueCharsFromData).join('');

    } catch (error) {
	console.error("퀴즈 데이터 파일 로드 또는 파싱 실패:", error);
	sentenceDisplay.textContent = "퀴즈 데이터 파일을 불러오는 데 실패했습니다.";
	pinyinDisplay.textContent = "";
	optionsContainer.innerHTML = "";
	feedbackMessage.textContent = `오류: ${error.message}`;
	processedData = []; // 오류 발생 시 데이터 비우기
    }
}

/**
 * 퀴즈를 설정하고 화면에 표시합니다.
 */
function setupNewQuiz() {

    switchNextButton(true);

    if (processedData.length === 0) {
	// loadAndParseData에서 이미 오류 메시지를 표시했을 수 있으므로, 여기서는 추가 메시지만 필요한 경우에 표시
	if (!sentenceDisplay.textContent.includes("실패했습니다") && !sentenceDisplay.textContent.includes("데이터가 없습니다")) {
	    sentenceDisplay.textContent = "퀴즈 데이터가 없습니다.";
	}
	pinyinDisplay.textContent = "";
	optionsContainer.innerHTML = "";
	// feedbackMessage는 loadAndParseData에서 설정된 오류 메시지를 유지할 수 있도록 여기서 건드리지 않거나,
	// 혹은 명시적으로 "퀴즈를 시작할 수 없습니다." 등으로 설정할 수 있습니다.
	return;
    }

    // 1. 랜덤으로 문장 선택
    currentQuizData = processedData[Math.floor(Math.random() * processedData.length)];
    const hanjaArray = currentQuizData.hanjaChars;

    if (hanjaArray.length === 0) {
	feedbackMessage.textContent = "선택된 문장에 한자가 없습니다. 다음 문제로 넘어갑니다.";
	setTimeout(setupNewQuiz, 1500);
	return;
    }

    // 2. 랜sedData.length)];
    //할 한자 선택
    targetHanjaIndexInSentence = Math.floor(Math.random() * hanjaArray.length);
    targetHanja = hanjaArray[targetHanjaIndexInSentence];

    // 3. 화면에 문장과 병음 표시
    pinyinDisplay.textContent = `병음: ${currentQuizData.pinyin}`;
    sentenceDisplay.innerHTML = '';

    hanjaArray.forEach((char, index) => {
	const charSpan = document.createElement('span');
	charSpan.classList.add('char');
	if (index === targetHanjaIndexInSentence) {
	    charSpan.textContent = '';
	    charSpan.classList.add('blank');
	} else {
	    charSpan.textContent = char;
	}
	sentenceDisplay.appendChild(charSpan);
    });

    // 4. 선택지 생성 (정답 1개 + 오답 3개)
    let options = [targetHanja];
    const tempHanjaPool = allAvailableHanjaChars.split('');

    while (options.length < 4 && tempHanjaPool.length > 0) {
	const randomCharIndex = Math.floor(Math.random() * tempHanjaPool.length);
	const randomHanja = tempHanjaPool[randomCharIndex];

	if (!options.includes(randomHanja)) { // 정답과도 다른 한자인지는 이미 allAvailableHanjaChars 구성시 고려됨 (정답도 포함되어 있음)
	    options.push(randomHanja);
	}
	tempHanjaPool.splice(randomCharIndex, 1); // 한 번 사용된 오답 후보는 풀에서 제거 (다양성 증진)

	// 만약 tempHanjaPool이 고갈되었는데 옵션이 4개가 안되면,
	// 부족한 만큼 정답과 같은 글자를 추가하지 않도록 주의 (이미 options에 정답이 있음)
	// 또는 그냥 가지고 있는 것 까지만 표시 (현재는 4개가 안될 수도 있음)
    }
    // 만약 위 루프 후에도 options.length < 4 이고 allAvailableHanjaChars에 글자가 부족하면,
    // 중복된 오답이나 대체 문자를 사용해야 할 수 있으나, 현재는 가능한 만큼만 생성.
    // 일반적으로 allAvailableHanjaChars가 충분히 크면 문제는 없음.

    for (let i = options.length - 1; i > 0; i--) {
	const j = Math.floor(Math.random() * (i + 1));
	[options[i], options[j]] = [options[j], options[i]];
    }

    // 5. 선택지 버튼 표시
    optionsContainer.innerHTML = '';
    options.forEach(option => {
	const button = document.createElement('button');
	button.textContent = option;
	button.addEventListener('click', () => handleOptionClick(option, button));
	optionsContainer.appendChild(button);
    });

    feedbackMessage.textContent = '';
    feedbackMessage.className = 'feedback-message';

}

/**
 * 사용자가 선택한 답을 확인합니다.
 */
function handleOptionClick(selectedHanja, clickedButton) {
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    if (selectedHanja === targetHanja) {
	feedbackMessage.textContent = "정답입니다!";
	feedbackMessage.className = 'feedback-message correct';
	clickedButton.style.backgroundColor = '#2ecc71';
	clickedButton.style.color = 'white';

	switchNextButton(false);
    } else {
	feedbackMessage.textContent = `틀렸습니다. 정답은 '${targetHanja}' 입니다.`;
	feedbackMessage.className = 'feedback-message incorrect';
	clickedButton.style.backgroundColor = '#e74c3c';
	clickedButton.style.color = 'white';
	buttons.forEach(btn => {
	    if (btn.textContent === targetHanja) {
		btn.style.backgroundColor = '#2ecc71';
		btn.style.color = 'white';
	    }
	});

	switchNextButton(false);
    }
}

function switchNextButton(v) {
    const nextButton = document.querySelector(".next-button");
    nextButton.disabled = v;
}

document.addEventListener("DOMContentLoaded", function () {
    const nextButton = document.querySelector(".next-button");
    
    nextButton.addEventListener("click", function () {
	setTimeout(setupNewQuiz, 500);
    });

    const selectBox = document.querySelector(".note-select");
    for (const option of selectBox.options) {
	if (option.value === notepath) {
	    option.selected = true;
	    break;
	}
    }
    selectBox.addEventListener("change", function () {
	const selectedValue = selectBox.value;
	window.location.href="?notepath="+selectedValue;
    });

} );

// --- 퀴즈 시작 ---
document.addEventListener('DOMContentLoaded', async () => {
    // 데이터 파일 경로를 여기에 지정합니다.
    await loadAndParseData(notepath);

    // loadAndParseData 함수 내에서 processedData의 길이를 확인하고,
    // 오류 발생 시 메시지를 표시하므로, 여기서는 setupNewQuiz만 호출합니다.
    // setupNewQuiz 함수 내부에서도 processedData.length를 확인합니다.
    setupNewQuiz();
});
