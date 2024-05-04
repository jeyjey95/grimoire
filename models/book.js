const mongoose = require('mongoose');

const bookSchema = mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  year: { type: Number, required: true },
  genre: { type: String, required: true },
  //ratings: { type: Number },
  imageUrl: { type: String, required: true },
  ratings: [
    {
      userId: { type: String, required: true },
      grade: { type: Number, min: 1, max: 5, required: true },
    },
  ],
  averageRating: Number,
});

module.exports = mongoose.model('Book', bookSchema);

