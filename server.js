
const express = require('express');
const app = express();
const path = require('path');

const indexRouter = require('./routes/index');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(express.json({ extended: true }));
app.use(cors({
  origin: ["http://localhost:3000"],
  method: ["POST", "GET"],
  credentials:true,
}));
app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));

app.use('/', indexRouter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const port = 8080;
app.listen(port, ()=>{
  console.log(port,'번 포트에서 서버 가동중');
})


module.exports = app;