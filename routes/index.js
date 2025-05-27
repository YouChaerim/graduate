const express = require('express');
const multer = require('multer');
const router = express.Router();
const sttController = require('../controller/sttController');
const scheduleController = require('../controller/scheduleController');


// router.get('/', indexCtrl.gethome); 

const upload = multer({ dest: 'uploads/' });

// router.post('/stt', upload.single('audio'), sttController.speechToText); // 프론트 연동용
router.get('/stt/mock', sttController.speechToTextMock);                // 목업 데이터용
router.post('/schedule/register', scheduleController.registerMeeting); //회의등록 API

module.exports = router;
