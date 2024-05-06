const multer = require('multer');

// const MIME_TYPES = {
//   'image/jpg': 'jpg',
//   'image/jpeg': 'jpg',
//   'image/png': 'png',
//   'image/webp': 'webp'
// };

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images')
  },
  filename: (req, file, callback) => {
    const name = file.originalname.split(' ').join('_');
    const withoutExt = name.substring(0, name.lastIndexOf('.'));

    var regex = /(?:\.([^.]+))?$/;
    var extension = regex.exec(name)[1];
    //const extension = MIME_TYPES[file.mimetype];
    
    callback(null, withoutExt + Date.now() + '.' + extension);
  }
});

module.exports = multer({ storage: storage }).single('image');