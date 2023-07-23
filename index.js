const express = require('express')
const cors = require('cors')
const { default: mongoose } = require('mongoose')
const app = express()
const User = require('./models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const salt = bcrypt.genSaltSync(10)
const secret = process.env.SECRET_KEY


app.use(cors({credentials:true, origin:process.env.URL}))
app.use(express.json())
app.use(cookieParser())

mongoose.connect(process.env.DB_URI);

app.post('/register', async (req, res) => {
  const {username,password} = req.body;
  try{
    const userDoc = await User.create({
      username,
      password:bcrypt.hashSync(password, salt)
    })
    res.json(userDoc);
  } catch(e){
      res.status(400).json(e)
  }
})


app.post('/login', async (req, res) => {
  const {username,password} = req.body;
  const userDoc = await User.findOne({username})

  if (!userDoc) {
    return res.status(400).json("wrong credentials");
  }

  const passOK = bcrypt.compareSync(password, userDoc.password)
  res.json(passOK)
  if (passOK){
    jwt.sign({username, id:userDoc._id}, secret, {}, (err, token) => {
      if (err) throw err
      res.cookie('token', token).json('ok')
    })
  } else {
    res.status(400).json("wrong credentials")
  }
})

app.get('/profile', (req, res) => {
  const {token} = req.cookies
  jwt.verify(token, secret, {}, (err,info) => {
    if (err) throw err
    res.json(info)
  })
})

app.post('/logout', (req,res) => {
  res.cookie('token', '').json('ok')
})


app.listen(4000);

// UB4KtZUKCea6tOHA
// mongodb+srv://paugarcia32:<UB4KtZUKCea6tOHA>@cluster0.a1t0quf.mongodb.net/?retryWrites=true&w=majority

// kHsVMM5Tm1Bw5yus
// mongodb+srv://paugarcia32:<password>@cluster0.pma0esm.mongodb.net/?retryWrites=true&w=majority