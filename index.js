const express = require('express')
const cors = require('cors')
const { default: mongoose } = require('mongoose')
const app = express()
const User = require('./models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const uploadMiddleware = multer({dest: 'uploads/'})
const fs = require('fs')
const Post = require('./models/Post')
require('dotenv').config()

const salt = bcrypt.genSaltSync(10)
const secret = process.env.SECRET_KEY


app.use(cors({credentials:true, origin:process.env.URL}))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'))


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


// app.post('/login', async (req, res) => {
//   const {username,password} = req.body;
//   const userDoc = await User.findOne({username})

//   if (!userDoc) {
//     return res.status(400).json("wrong credentials");
//   }

//   const passOK = bcrypt.compareSync(password, userDoc.password)
//   res.json(passOK)
//   if (passOK){
//     jwt.sign({username, id:userDoc._id}, secret, {}, (err, token) => {
//       if (err) throw err
//       res.cookie('token', token).json({
//         id:userDoc._id,
//         username,
//       })
//     })
//   } else {
//     res.status(400).json("wrong credentials")
//   }
// })


app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });

  if (!userDoc) {
    return res.status(400).json("wrong credentials");
  }

  const passOK = bcrypt.compareSync(password, userDoc.password);

  if (passOK) {
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("wrong credentials");
  }
});



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

app.get('/post', async (req,res) => {
  res.json(await Post.find()
  .populate('author', ['username'])
  .sort({createdAt: -1})
  .limit(20)
  )
})


// app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
//   const {originalName,path} = req.file
//   const parts =  originalName.split('.')
//   const ext = parts[parts.length -1]
//   const newPath = path+'.'+ext
//   fs.renameSync(path, newPath)

//  const {token} = req.cookies
//     jwt.verify(token, secret, {}, async (err,info) => {
//     if (err) throw err
//     const { title, summary, content } = req.body;
//     const postDoc = await Post.create({
//       title,
//       summary,
//       content,
//       cover: newPath,
//       author: info.id
//     });
//     res.json(postDoc);
//     })


// })


app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error("No file received.");
    }

    const { originalname, path } = req.file;
    if (!originalname || !path) {
      throw new Error("Invalid file data received.");
    }

    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, newPath);

    const {token} = req.cookies
    jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id
    });
    res.json(postDoc);
    })
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/post/:id', async(req, res)=> {
  const {id} = req.params
  const postDoc = await Post.findById(id).populate('author', ['username'])
  res.json(postDoc)
})


app.listen(4000);

// UB4KtZUKCea6tOHA
// mongodb+srv://paugarcia32:<UB4KtZUKCea6tOHA>@cluster0.a1t0quf.mongodb.net/?retryWrites=true&w=majority

// kHsVMM5Tm1Bw5yus
// mongodb+srv://paugarcia32:<password>@cluster0.pma0esm.mongodb.net/?retryWrites=true&w=majority