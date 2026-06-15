const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'daycare-app', // You can organize uploads in folders
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Optional transformations
  }
});

// Filtre pour les types de fichiers acceptés
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const isMimeValid = allowedTypes.test(file.mimetype);
  const isExtValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (isMimeValid && isExtValid) {
    return cb(null, true);
  }

  cb(new Error('Invalid file type. Only JPG, JPEG, and PNG are allowed.'));
};

// Middleware multer with Cloudinary storage
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5 Mo par fichier
  fileFilter
});

// Export pour utilisation dans les routes
module.exports = {
  singleUpload: upload.single('photoProfil'),
  serviceImageUpload: upload.single('image'),
  multipleUpload: upload.array('images', 5),
  prestataireDocsUpload: upload.fields([
    { name: 'photoProfil', maxCount: 1 },
    { name: 'documentIdentite', maxCount: 1 },
    { name: 'documentEntreprise', maxCount: 1 }
  ])
};