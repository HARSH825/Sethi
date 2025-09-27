// middleware/errorHandler.js (Simplified)
const errorHandler = (error, req, res, next) => {
  console.error('💥 Error:', error.message);
  
  // Multer file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.'
    });
  }
  
  if (error.message === 'Only audio files allowed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only audio files allowed.'
    });
  }
  
  // Database errors
  if (error.code && error.code.startsWith('P')) {
    return res.status(500).json({
      success: false,
      message: 'Database error occurred'
    });
  }
  
  // Default error response
  const status = error.status || error.statusCode || 500;
  res.status(status).json({
    success: false,
    message: error.message || 'Internal server error',
    timestamp: new Date()
  });
};

export default errorHandler;
