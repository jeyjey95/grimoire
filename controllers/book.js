const Book = require('../models/book');
const fs = require('fs');
const sharp = require('sharp');

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id;
  delete bookObject.userId;

  const resizedFileName = `resized-${req.file.filename.replace(/\.[^.]+$/, '')}.webp`;
  const resizedImagePath = `./images/${resizedFileName}`;
  // Utilisez Sharp pour redimensionner l'image
  sharp.cache(false)
  sharp(req.file.path)
    .resize(412, 520)
    .toFormat('webp')
    .toFile(resizedImagePath, (err, info) => {
      if (err) {
        return res.status(401).json({ error: err.message });
      }
      // Supprimez le fichier original après redimensionnement
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Erreur lors de la suppression du fichier original:', unlinkErr);
        }

        const book = new Book({
          ...bookObject,
          userId: req.auth.userId,
          imageUrl: `${req.protocol}://${req.get('host')}/images/${resizedFileName}`
        });

        book.save()
          .then(() => { res.status(201).json({ message: 'Objet enregistré !' }) })
          .catch(error => res.status(400).json({ error }));
      });
    });
};

exports.getBooksBestRating = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then(bestRatedBook => res.status(200).json(bestRatedBook))
    .catch(error => res.status(400).json({ error }))
};

exports.addRating = (req, res) => {
  Book.findOne({ _id: req.params.id })
    .then(book => {
      // // Vérifier si l'utilisateur a déjà noté ce livre
      // const existingRating = book.ratings.find(
      //   rating => rating.userId === req.auth.userId
      // );
      // if (existingRating) {
      //   return res.status(403).json({
      //     message:
      //       'Vous avez déjà noté ce livre ! Impossible de modifier la note.',
      //   });
      // }

      // Vérifie que la note est comprise entre 1 et 5 et qu'une note n'a pas déja été attribuer par cette utilisateur
      if (book.ratings.some(rating => rating.userId === req.userId) || (req.body.grade < 1 || req.body.grade > 5)) {
        res.status(500).json({ error: 'Erreur de la notation' });
      } else {
        // Ajouter la nouvelle note au livre
        book.ratings.push({
          userId: req.auth.userId,
          grade: req.body.rating,
        });
        // Mettre à jour la note moyenne
        const totalRatings = book.ratings.length;
        const sumOfRatings = book.ratings.reduce((acc, rating) => acc + rating.grade, 0);
        book.averageRating = sumOfRatings / totalRatings;
        book.averageRating = parseFloat(book.averageRating.toFixed(1));
        // Sauvegarde le livre
        book.save()
          .then(book => {
            res.status(200).json(book);
          })
          .catch(error => res.status(500).json({ error }));
      }
    })
    .catch(error => res.status(404).json({ error }));
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => res.status(200).json(book))
    .catch((error) => {
      res.status(404).json({
        error: error
      });
    }
    );
  // Book.find()
  //   .sort({averageRating: -1})
  //   .limit(3)
  //   .then(bestRatedBook => res.status(200).json(bestRatedBook))
  //   .catch(error => res.status(400).json({error}))
};

exports.modifyBook = (req, res, next) => {
  const bookObject = req.file ? {
    ...JSON.parse(req.body.book),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete bookObject._userId;

  Book.findOne({ _id: req.params.id })
    .then(book => {
      if (book.userId !== req.auth.userId) {
        return res.status(403).json({ message: 'unauthorized request' });
      } else if (req.file) {
        // Spécifiez un chemin de sortie différent pour le fichier redimensionné
        const resizedFileName = `resized-${req.file.filename.replace(/\.[^.]+$/, '')}.webp`;
        const resizedImagePath = `./images/${resizedFileName}`;
        // Utilisez Sharp pour redimensionner l'image
        sharp.cache(false)
        sharp(req.file.path)
          .resize(412, 520, {
            kernel: sharp.kernel.nearest,
            fit: 'cover',
            position: 'center',
          })
          .toFormat('webp')
          .toFile(resizedImagePath, (err, info) => {
            if (err) {
              return res.status(401).json({ error: err.message });
            }

            //suppression fichier temporaire
            fs.unlink(req.file.path, (unlinkErr) => {
              if (unlinkErr) {
                console.error('Erreur lors de la suppression du fichier original:', unlinkErr);
              }

              var file = book.imageUrl.substring(book.imageUrl.lastIndexOf('/') + 1).replace(/((\?|#).*)?$/, '');

              // suppression ancien fichier
              fs.unlink('./images/' + file, (unlinkErr) => {
                if (unlinkErr) {
                  console.error('Erreur lors de la suppression du fichier original:', unlinkErr);
                }
                // Mise à jour du livre avec la nouvelle URL redimensionnée
                Book.updateOne({ _id: req.params.id }, { ...bookObject, imageUrl: `${req.protocol}://${req.get('host')}/images/${resizedFileName}`, _id: req.params.id })
                  .then(() => res.status(200).json({ message: 'Livre modifié!= ' + req.file.path }))
                  .catch((updateError) => res.status(401).json({ error: updateError.message }));
              });
            });
          });
      } else {
        Book.updateOne({ _id: req.params.id }, { ...bookObject })
          .then(() => res.status(200).json({ message: 'Livre modifié!' }))
          .catch((updateError) => res.status(500).json({ error: updateError.message }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};
// const id = req.params.id;
// const book = await Book.findById(id);
// if (!book) return res.status(404).send("Book not found");
// //const userId = book.userId;
// if (book.userId !== req.auth.userId) return res.status(401).send("You can only update your own books");
// if (req.file) {
//   const newImageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
//   const oldImageUrl = book.imageUrl;
//   if (oldImageUrl && fs.existsSync(oldImageUrl)) {
//     fs.unlinkSync(oldImageUrl);
//   }
//   book.imageUrl = newImageUrl;
// }
// if (req.body.title) book.title = req.body.title;
// if (req.body.author) book.author = req.body.author;
// if (req.body.year) book.year = req.body.year;
// if (req.body.genre) book.genre = req.body.genre;
// const result = await book.save();
// res.send(result);
//}

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => {
      if (book.userId != req.auth.userId){
        res.status(403).json({message: 'unauthorized request' });
      } else {
        const filename = book.imageUrl.split('/images/')[1];
        //const filename = book.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, () => {
          Book.deleteOne({ _id: req.params.id })
            .then(() => { res.status(200).json({ message: 'Objet supprimé !' }) })
            .catch(error => res.status(401).json({ error }));
        });
      }
    })
    .catch(error => {
      res.status(500).json({ error });
    })
};

exports.getAllBooks = (req, res, next) => {
  Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error: error }));
};