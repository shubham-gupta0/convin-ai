const admin = require('firebase-admin');

const apiKey = 'my-static-api-key';

// Middleware to validate Firebase ID token
const authenticate = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];

    // Check for API key
    if (process.env.NODE_ENV === 'test' && token === apiKey) {
        return next();
    }

    if (!idToken) {
        return res.status(401).json({ error: 'Unauthorized access. No token provided.' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next(); // Proceed to the next middleware/controller
    } catch (error) {
        res.status(403).json({ error: 'Unauthorized access. Invalid token.' });
    }
};

module.exports = authenticate;
