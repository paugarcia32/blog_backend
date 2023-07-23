const express = require('express')
const cors = require('cors')
const { default: mongoose } = require('mongoose')
const app = express()
const User = require('./models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const salt = bcrypt.genSaltSync(10)
const secret = process.env.SECRET_KEY


app.use(cors({credentials:true, origin:process.env.URL}))
app.use(express.json())

mongoose.connect(process.env.DB_URI);

app.post('/register', async (req, res) =>{
  const {username,password} = req.body;
  try{
    const userDoc = await User.create({
    username,
    password:bcrypt.hashSync(password, salt)
  })
  res.json(userDoc);
  }catch(e){
res.status(400).json(e)
  }


})


app.post('/login', async (req, res) =>{
  const {username,password} = req.body;
  const userDoc = await User.findOne({username})

  if (!userDoc) {
    return res.status(400).json("wrong credentials"); // Credenciales incorrectas, enviar respuesta de error y detener la función
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

app.listen(4000);

// UB4KtZUKCea6tOHA
// mongodb+srv://paugarcia32:<UB4KtZUKCea6tOHA>@cluster0.a1t0quf.mongodb.net/?retryWrites=true&w=majority

// kHsVMM5Tm1Bw5yus
// mongodb+srv://paugarcia32:<password>@cluster0.pma0esm.mongodb.net/?retryWrites=true&w=majority