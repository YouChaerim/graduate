const pool = require('../db');


/**
 * home 화면
 */
exports.gethome = async (req, res) => {
  console.log("책 목록 페이지");

  res.send({
    message: 'home',
  });
}