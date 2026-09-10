const User=require('../models/User');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const generateTokens=require('../utils/generateTokens');

exports.register=async(req,res)=>{
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'student'
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Registration failed", error: err.message });
    }
}
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password." });
        }
        const { accessToken, refreshToken } = generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({
            message: "Login successful!",
            accessToken,
            refreshToken,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
    }
};
exports.googleLogin=async(req,res)=>{
    try{
        const {idToken}=req.body;
        if(!idToken){
            return res.status(400).json({message:"Google ID Token is required"});
        }
        const ticken=await client.verifyIdToken({
            idToken,
            audience:process.env.GOOGLE_CLIENT_ID
        });
        const { name, email, sub: googleId } = ticket.getPayload();
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                name,
                email,
                role: 'student',
                googleId
            });
        } else if (!user.googleId) {
            user.googleId = googleId;
        }
        const { accessToken, refreshToken } = generateTokens(user);

        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({
            message: "Google login successful!",
            accessToken,
            refreshToken,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    }
    catch (err) {
        res.status(500).json({ message: "Google Auth failed", error: err.message });
    }
}
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh Token is required." });
        }
        const user = await User.findOne({ refreshToken });
        if (!user) {
            return res.status(403).json({ message: "Invalid Refresh Token or Session Expired." });
        }
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: "Refresh Token expired. Please login again." });
            }
            const newAccessToken = jwt.sign(
                { userId: user._id, name: user.name, role: user.role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            );

            res.status(200).json({ accessToken: newAccessToken });
        });
    } catch (err) {
        res.status(500).json({ message: "Could not refresh token", error: err.message });
    }
};
exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        await User.findOneAndUpdate({ refreshToken }, { refreshToken: null });

        res.status(200).json({ message: "Logged out successfully." });
    } catch (err) {
        res.status(500).json({ message: "Logout failed", error: err.message });
    }
};