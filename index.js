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
const Tag = require('./models/Tag')
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







app.get('/post', async (req, res) => {
  try {
    const { page = 1, perPage = 3 } = req.query;
    const currentPage = parseInt(page);
    const postsPerPage = parseInt(perPage);

    // Calcular el índice de la primera publicación y el índice de la última publicación en la página actual
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;

    // Consultar las publicaciones con paginación
    const posts = await Post.find()
      .populate('author', ['username'])
      .populate('tag', ['title'])
      .sort({ createdAt: -1 })
      .skip(indexOfFirstPost) // Saltar las publicaciones anteriores a la página actual
      .limit(postsPerPage); // Limitar el número de publicaciones por página

    // Contar el total de publicaciones en la base de datos para calcular el total de páginas
    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / postsPerPage);

    // Comprueba si hay publicaciones (posts) en la base de datos
    if (posts.length === 0) {
      return res.status(404).json({ message: "No se encontraron publicaciones." });
    }

    res.json({ posts, totalPages });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las publicaciones." });
  }
});

app.get('/post/all', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', ['username'])
      .populate('tag', ['title'])
      .sort({ createdAt: -1 });

    if (posts.length === 0) {
      return res.status(404).json({ message: "No se encontraron publicaciones." });
    }

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las publicaciones." });
  }
});



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

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;
      const { title, summary, content, tag } = req.body;

      // Convierte el campo 'tag' en un array si se envió un solo ID
      const tagsArray = Array.isArray(tag) ? tag : [tag];

      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author: info.id,
        tag: tagsArray, // Usa el array de IDs de tags
      });

      // Obtener el ID del post recién creado
      const postId = postDoc._id;

      // Iterar sobre los IDs de tags para agregar el post a cada tag
      for (const tagId of tagsArray) {
        const tagToUpdate = await Tag.findById(tagId);
        if (!tagToUpdate) {
          throw new Error(`El tag con ID ${tagId} no existe.`);
        }
        tagToUpdate.posts.push(postId);
        await tagToUpdate.save();
      }

      res.json(postDoc);
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});




app.get('/post/:id', async(req, res)=> {
  const {id} = req.params
  const postDoc = await Post.findById(id)
  .populate('author', ['username'])
  .populate('tag', ['title'])
  res.json(postDoc)
})

// app.put('/post',uploadMiddleware.single('file'), async (req, res) =>{
//   let newPath = null
//   if (req.file){
//     const { originalname, path } = req.file;
//     const parts = originalname.split('.');
//     const ext = parts[parts.length - 1];
//     newPath = path + '.' + ext;
//     fs.renameSync(path, newPath);
//   }

//   const {token} = req.cookies
//    jwt.verify(token, secret, {}, async (err,info) => {
//     if (err) throw err
//     const {id, title, summary, content } = req.body;
//     const postDoc = await Post.findById(id)
//     const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
//     if (!isAuthor) {
//       return res.status(400).json('you are not the author')
//     }

//     await postDoc.updateOne({
//       title,
//       summary,
//       content,
//       cover:newPath ? newPath : postDoc.cover,
//     })

//     res.json(postDoc);
//     })


// })

app.put('/post/:id', uploadMiddleware.single('file'), async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, summary, content } = req.body;

    // Verificar si el post con el ID dado existe
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "El post no existe." });
    }

    // Verificar si el usuario es el autor del post
    const { token } = req.cookies;
    const decodedToken = jwt.verify(token, secret);
    if (post.author.toString() !== decodedToken.id) {
      return res.status(403).json({ error: "No tienes permiso para editar este post." });
    }

    // Actualizar los campos del post
    post.title = title;
    post.summary = summary;
    post.content = content;

    // Actualizar la imagen de portada si se ha enviado un nuevo archivo
    if (req.file) {
      const { originalname, path } = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      const newPath = path + '.' + ext;
      fs.renameSync(path, newPath);
      post.cover = newPath;
    }

    // Guardar los cambios en la base de datos
    const updatedPost = await post.save();

    res.json(updatedPost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



app.post('/tags', async (req, res) => {
  try {
    const { title, id } = req.body;

    // Crear el nuevo tag sin asociar ningún post por ahora
    const newTag = await Tag.create({
      title,
      id
    });

    res.status(201).json(newTag);
  } catch (error) {
    res.status(500).json({ error: 'Error creating tag' });
  }
});


app.get('/tags', async (req, res) => {
  try {
    const tags = await Tag.find();

    // Comprueba si hay tags en la base de datos
    if (tags.length === 0) {
      return res.status(404).json({ message: "No se encontraron tags." });
    }

    // Obtén un nuevo array con el _id y el title de los tags
    const tagsWithIdAndTitle = tags.map((tag) => ({
      _id: tag._id,
      title: tag.title,
    }));

    res.json(tagsWithIdAndTitle);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los tags." });
  }
});

app.get('/posts/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params;

    // Verificar si el tagId es un ObjectId válido antes de hacer la consulta
    if (!mongoose.Types.ObjectId.isValid(tagId)) {
      return res.status(400).json({ message: "El ID del tag no es válido." });
    }

    const posts = await Post.find({ tag: tagId })
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20);

    // Comprueba si hay publicaciones (posts) en la base de datos
    if (posts.length === 0) {
      return res.status(404).json({ message: "No se encontraron publicaciones con este tag." });
    }

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las publicaciones." });
  }
});




app.listen(4000);

// UB4KtZUKCea6tOHA
// mongodb+srv://paugarcia32:<UB4KtZUKCea6tOHA>@cluster0.a1t0quf.mongodb.net/?retryWrites=true&w=majority

// kHsVMM5Tm1Bw5yus
// mongodb+srv://paugarcia32:<password>@cluster0.pma0esm.mongodb.net/?retryWrites=true&w=majority