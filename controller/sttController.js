const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// 🔧 정규화 함수 정의
function normalizeText(text) {
    return text
        .replace(/(랑|이랑|하고|과|와)/g, "") // 조사 제거
        .replace(/(1\s?시간짜리|1\s?시간만|한\s?시간|한시간짜리|한 시간|한시간)/g, "1시간")
        .replace(/(2\s?시간짜리|2\s?시간만|두\s?시간|두시간짜리|두 시간|두시간)/g, "2시간")
        .replace(/(30\s?분짜리|30\s?분만)/g, "30분")
        .replace(/(다음주|다음\s?주)/g, "다음 주")
        .replace(/(이번주|이번\s?주)/g, "이번 주")
        .replace(/(되면|대면)/g, "대면")
        .replace(/(에|으로|까지|정도|쯤에|중에|부터|짜리)/g, "")
        .replace(/화요예|화요일|화유일|회요일/g, "화요일")
        .replace(/수요일|수유일|수요이/g, "수요일")
        .replace(/목요일|목요이|몽요일/g, "목요일")
        .replace(/금요일|금요이|급요일/g, "금요일")
        .replace(/토요일|토유일|토요이/g, "토요일")
        .replace(/일요일|일요이|일유일/g, "일요일")
        .replace(/월요일|월요이|멀요일/g, "월요일")
        .replace(/\s+/g, " ") // 여러 공백 → 하나로
        .trim();
}

// ✅ 실제 오디오 파일로 STT + Rasa 요청
// exports.speechToText = (req, res) => {
//     const audioPath = path.join(__dirname, '../uploads/', req.file.filename);
//     const command = `python3 whisper/stt.py ${audioPath}`;

//     exec(command, async (error, stdout, stderr) => {
//         if (error) {
//         console.error('STT 실패:', stderr);
//         return res.status(500).json({ error: '음성 변환 실패' });
//         }

//         const originalText = stdout.trim();
//         const normalized = normalizeText(originalText);

//         try {
//         const rasaRes = await axios.post('http://localhost:5005/model/parse', {
//             text: normalized,
//         });

//         res.json({
//             original: originalText,
//             normalized,
//             rasa: rasaRes.data,
//         });
//         } catch (rasaError) {
//         console.error('Rasa 연결 실패:', rasaError.message);
//         res.status(500).json({ error: 'Rasa 분석 실패' });
//         }
//     });
// };

// ✅ 목업 음성 파일로 STT + Rasa 요청
exports.speechToTextMock = (req, res) => {
    const mockPath = path.join(__dirname, '../mock/minsang_test3.mp3');
    const command = `python3 whisper/stt.py ${mockPath}`;

    exec(command, async (error, stdout, stderr) => {
        if (error) {
        console.error('STT 실패:', stderr);
        return res.status(500).json({ error: '목업 STT 실패' });
        }

        const originalText = stdout.trim();
        const normalized = normalizeText(originalText);

        console.log("🧾 원문:", originalText);
        console.log("🧾 정규화된 문장:", normalized);

        try {
        const rasaRes = await axios.post('http://localhost:5005/model/parse', {
            text: normalized,
        });

        res.json({
            original: originalText,
            normalized,
            rasa: rasaRes.data,
        });
        } catch (rasaError) {
        console.error('Rasa 연결 실패:', rasaError.message);
        res.status(500).json({ error: 'Rasa 분석 실패' });
        }
    });
};
