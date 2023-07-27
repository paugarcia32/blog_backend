const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const TagSchema = new Schema(
  {
    title: String,
    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  }
);

const TagModel = model('Tag', TagSchema);
module.exports = TagModel;
