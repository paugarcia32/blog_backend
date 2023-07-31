const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const CommentSchema = new Schema({
  autor: String,
  fecha_comentario: Date,
  contenido: String,
  likes: Number,
});

const CommentModel = model('Comment', CommentSchema);
module.exports = CommentModel;
