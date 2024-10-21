const express = require('express');
const { registerUser ,loginUser,getUserDetails} = require('../controllers/userController');

const router = express.Router();

// User Registration Route
router.post('/register', registerUser);

// User Login Route
router.post('/login', loginUser);
router.get('/:uid', getUserDetails);

module.exports = router;
