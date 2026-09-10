const jwt=require('jsonwebtoken');

const generateTokens=(user)=>{
    const accessToken=jwt.sign(
        {userId:user._id,name:user.name,role:user.role},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:'15m'}
    );
    const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );
    return {accessToken,refreshToken};
};
module.exports=generateTokens;

