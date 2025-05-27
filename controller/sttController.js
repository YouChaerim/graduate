const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const db = require('../db');

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

// ✅ participants 엔티티 필터링 함수
async function filterValidParticipants(rawTextList, currentUserId) {
    const [rows] = await db.query(`
        SELECT u.name
        FROM friends f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = ? AND f.status = 'accepted'
    `, [currentUserId]);

    const validNames = rows.map(r => r.name);
    const result = [];

    rawTextList.forEach(chunk => {
        chunk.split(/\s+/).forEach(word => {
        if (validNames.includes(word) && !result.includes(word)) {
            result.push(word);
        }
        });
    });

    return result;
}

// 🔁 상대 날짜 + 요일 → 실제 날짜 변환
function convertToDate(relativeText, preferredDay) {
    const dayMap = {
        '월요일': 1,
        '화요일': 2,
        '수요일': 3,
        '목요일': 4,
        '금요일': 5,
        '토요일': 6,
        '일요일': 0
    };
    const today = new Date();
    let base = new Date();

    if (relativeText === '이번 주') {
        base.setDate(today.getDate() + (7 - today.getDay()));
    } else if (relativeText === '다음 주') {
        base.setDate(today.getDate() + (7 - today.getDay()) + 7);
    }

    if (preferredDay && dayMap[preferredDay] !== undefined) {
        const dayDiff = (7 + dayMap[preferredDay] - base.getDay()) % 7;
        base.setDate(base.getDate() + dayDiff);
    }

    return base.toISOString().split('T')[0];
}

// 🧪 MOCK용 STT + Rasa 연결
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

        console.log('🧾 원문:', originalText);
        console.log('🧾 정규화된 문장:', normalized);

        try {
        const rasaRes = await axios.post('http://localhost:5005/model/parse', {
            text: normalized,
        });

        const participantRaw = rasaRes.data.entities
            .filter(e => e.entity === 'participants')
            .map(e => e.value);

        const allWords = participantRaw.map(t => t.split(/\s+/)).flat();
        const participants = await filterValidParticipants(allWords, 2);

        const preferredDay = rasaRes.data.entities.find(e => e.entity === 'preferred_day')?.value || null;
        const deadlineRaw = rasaRes.data.entities.find(e => e.entity === 'deadline')?.value || null;
        const deadline = convertToDate(deadlineRaw, preferredDay);
        const duration = rasaRes.data.entities.find(e => e.entity === 'duration')?.value === '1시간' ? 60 : 30;
        const meeting_type = rasaRes.data.entities.find(e => e.entity === 'meeting_type')?.value || '온라인';
        const urgency = normalized.includes('빠르게'); // 예시

        res.json({
        original: originalText,
        normalized,
        rasa: rasaRes.data,
        participants,
        deadline,
        preferred_day: preferredDay,
        duration,
        meeting_type,
        urgency
        });

        } catch (rasaError) {
        console.error('Rasa 연결 실패:', rasaError.message);
        res.status(500).json({ error: 'Rasa 분석 실패' });
        }
    });
};