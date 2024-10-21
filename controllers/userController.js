const {admin,db} = require('../config/firebaseConfig');

const validateUserInput = (email, mobile) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^[0-9]{10}$/;

    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Invalid email format' };
    }
    if (!mobileRegex.test(mobile)) {
        return { valid: false, message: 'Invalid mobile number' };
    }
    return { valid: true };
};

// Register a new user
exports.registerUser = async (req, res) => {
    const { email, password, name, mobile } = req.body;

    // Input validation (add more validation as needed)
    if (!email || !password || !name || !mobile) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    // Validate input
    const validation = validateUserInput(email, mobile);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
    }

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
            mobile: mobile,
        });


        // Here, you can save additional user info (name, mobile) in Firestore database
        await db.collection('users').doc(userRecord.uid).set({
            name,
            email,
            mobile,
        });


        res.status(201).json({ uid: userRecord.uid, email, name, mobile });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// User Login
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Verify the user's credentials using Firebase Authentication (handle this client-side)
        const user = await admin.auth().getUserByEmail(email);
        
        res.json({ uid: user.uid, email: user.email, });
    } catch (error) {
        res.status(400).json({ error: 'Invalid credentials' });
    }
};


// Retrieve User Details
exports.getUserDetails = async (req, res) => {
    const { uid } = req.params;

    try {
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        res.json({ uid, email: userData.email, name: userData.name, mobile: userData.mobile });
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving user details' });
    }
};

