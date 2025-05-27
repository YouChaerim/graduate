// 📁 back/controller/scheduleController.js

const db = require('../db');

function isOverlapping(start, end, schedules) {
    return schedules.some(schedule => {
        const s = new Date(schedule.start_time);
        const e = new Date(schedule.end_time);
        return start < e && end > s;
    });
    }

    function findAvailableTimeSlot(schedulesByUser, deadline, durationMinutes, preferredDay, urgency) {
    const durationMs = durationMinutes * 60000;
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(18, 0, 0, 0);

    const startOfWeek = new Date(deadlineDate);
    startOfWeek.setDate(deadlineDate.getDate() - deadlineDate.getDay() + 1);
    startOfWeek.setHours(9, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 4);
    endOfWeek.setHours(18, 0, 0, 0);

    const step = 30 * 60000;
    let candidateSlots = [];
    let current = new Date(startOfWeek);

    while (current.getTime() + durationMs <= endOfWeek.getTime()) {
        const start = new Date(current);
        const end = new Date(current.getTime() + durationMs);

        const startHour = start.getHours();
        const endHour = end.getHours();
        const day = start.getDay();

        if (startHour < 9 || endHour > 18 || day === 0 || day === 6) {
        current = new Date(current.getTime() + step);
        continue;
        }

        const available = Object.values(schedulesByUser).every(schedules => !isOverlapping(start, end, schedules));
        if (available) candidateSlots.push({ start, end });

        current = new Date(current.getTime() + step);
    }

    if (preferredDay) {
        const preferredDayIndex = {
        '일요일': 0,
        '월요일': 1,
        '화요일': 2,
        '수요일': 3,
        '목요일': 4,
        '금요일': 5,
        '토요일': 6
        }[preferredDay];

        const preferredSlots = candidateSlots.filter(slot => slot.start.getDay() === preferredDayIndex);
        if (preferredSlots.length > 0) return preferredSlots[0];
    }

    if (urgency && candidateSlots.length > 0) {
        return candidateSlots[0];
    }

    return candidateSlots[0] || null;
}

exports.registerMeeting = async (req, res) => {
    const { participants, deadline, duration, meeting_type, preferred_day, urgency } = req.body;
    const currentUserId = 2; // 로그인 사용자 ID (임시)

    try {
        const [[currentUser]] = await db.query(`SELECT name FROM users WHERE id = ?`, [currentUserId]);
        const fullParticipants = [currentUser.name, ...participants];

        const schedulesByUser = {};
        for (const name of fullParticipants) {
        const [rows] = await db.query(
            `SELECT start_time, end_time FROM calendar
            JOIN users ON calendar.created_by = users.id
            WHERE users.name = ? AND start_time <= ? AND end_time >= NOW()`,
            [name, deadline]
        );
        schedulesByUser[name] = rows;
        }

        const slot = findAvailableTimeSlot(schedulesByUser, deadline, duration, preferred_day, urgency);

        if (!slot) {
        return res.status(400).json({ message: '공통 가능한 시간이 없습니다.' });
        }

        for (const name of fullParticipants) {
        const [[user]] = await db.query(`SELECT id FROM users WHERE name = ?`, [name]);
        await db.query(
            `INSERT INTO calendar (title, start_time, end_time, meeting_type, created_by, user_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
            ['회의', slot.start, slot.end, meeting_type, currentUserId, user.id]
        );
        }

        res.json({
        message: '회의가 등록되었습니다.',
        scheduled_time: `${slot.start.toISOString()} ~ ${slot.end.toISOString()}`
        });

    } catch (err) {
        console.error('회의 등록 실패:', err);
        res.status(500).json({ message: '서버 오류' });
    }
};
