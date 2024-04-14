const {promisify} = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('.//../utils/appError');
const sendEmail = require('.//../utils/email');


const signToken = id=>{
    return jwt.sign({id},process.env.JWT_SECRET,{
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createSendToken = (user,statusCode,res)=>{
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date( Date.now() + process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000 ),
        httpOnly: true  // cookie canonot be accesed/modified by browser (prevent cross side scripting attacks)
    }

    if(process.env.NODE_ENV==="production") cookieOptions.secure = true;  // cookie will only be sent on https

    res.cookie('jwt',token,cookieOptions);   // 'jwt' is cookie name

    // remove password from output
    user.password = undefined;

    return res.status(statusCode).json({
        status: 'success',
        token,
        data:{
            user
        }
    });
}

exports.signup = catchAsync(async (req,res,next)=>{
    const newUser = await userModel.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    })
    // const newUser = await userModel.create(req.body)
    createSendToken(newUser,201,res);

    // next();
})

exports.login = catchAsync(async (req,res,next)=>{

    const {email,password} = req.body;

    // 1) check if email and password exist
    if(!email || !password){
        return next(new AppError('Pls provide email and password',400));
    }

    // 2) check if user exists and pwd is correct
    const user = await userModel.findOne({email}).select('+password');
    const correct = await user?.correctPassword(password,user.password);

    if(!user || !correct){
        return next(new AppError('Incorrect email or password',401)); // be vague to not tell whether email is correct or not
    }

    // 3) if everything ok , send token to client
    createSendToken(user,200,res);
    // next();
})

exports.logout = (req,res)=>{
    res.cookie('jwt','loggedout',{
        expires: new Date(Date.now() + 10*1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
}

exports.protect = catchAsync(async (req,res,next)=>{

    // 1)  get the token and check if it exists

    let token;
    if(req.headers.authorization && `${req.headers.authorization}`.startsWith("Bearer")){
        token = req.headers.authorization.split(' ')[1];
    }else if(req.cookies.jwt){
        token = req.cookies.jwt;
    }
    // console.log(token);

    if(!token){
        return next(new AppError("You are not logged in . Pls login to get access",401));
    }


    // 2) Verify the token

    const decoded = await promisify(jwt.verify)(token,process.env.JWT_SECRET);
    // console.log(decoded);


    // 3) Check if user still exists

    // const currUser = await userModel.findOne({_id :decoded.id}).select('+password');
    const currUser = await userModel.findById(decoded.id);
    // console.log(currUser);
    if(!currUser) return next( new AppError("The user no longer exists!",401));


    // 4) Check if user changed pwd after token was issued

    if(currUser.changesPasswordAfter(decoded.iat)){
        return next(new AppError("User recently changed password! Pls login again",401));
    }


    // 5) Grant access to protected route
    req.user = currUser;  // Very imp for restrictTo to work properly !!
    res.locals.user = currUser;
    
    next();
})

exports.isLoggedIn = async (req,res,next)=>{
    // 1)  get the token and check if it exists

    if(req.cookies.jwt){

        try{
             // 2) Verify the token

            const decoded = await promisify(jwt.verify)(req.cookies.jwt,process.env.JWT_SECRET);
            // console.log(decoded);


            // 3) Check if user still exists

            const currUser = await userModel.findById(decoded.id);
            if(!currUser) return next();


            // 4) Check if user changed pwd after token was issued

            if(currUser.changesPasswordAfter(decoded.iat)){
                return next();
            }

            // 5) There is a logged in user
            
            res.locals.user = currUser;  // all pug templates will have access to this object
            return next();  
        }catch(err){
            return next();
        }
    }
    next();
}

exports.restrictTo = (...roles)=>{
    // roles = array
    return (req,res,next)=>{
        const rolesArr = roles[0];
        if(!rolesArr.includes(req.user.role)){
            return next(new AppError("You do not have permission to access the route",403))  // 403 = unauthorized
        }
        next();
    }
}

exports.forgotPassword = catchAsync(async(req,res,next)=>{

    // 1) Get user based on provided email

    const user = await userModel.findOne({ email: req.body.email });
    if(!user) return next(new AppError("Email not found",404));


    // 2) Generate random reset token

    const resetToken = await user.createPasswordResetToken();

    // SUPER IMP
    // Mongoose registers validation as a pre('save') hook on every schema by default
    // Since we didn't save values for required fields validation will give error
    await user.save({ validateBeforeSave: false });


    // 3) Send it to user's email

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to ${resetURL}\nIf you didn't forget your password, please ignore this email`;
    
    try{
        await sendEmail({
            email: user.email,
            subject: 'Your password resets in 10 minutes',
            message
        })
    
        res.status(200).json({
            status: 'success',
            message:'Token sent to email!'
        })
    }catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError('There was an error sending the email! Try again later!'),500);
    }

})

exports.resetPassword = catchAsync(async (req,res,next)=>{

    // 1)  Get user based on the token

    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await userModel.findOne({
        passwordResetToken: hashedToken, 
        passwordResetExpire: {$gt : Date.now()}
    })


    // 2) If token has not expired then set new password

    if(!user) return next(new AppError("Token is invalid or token expired",400));

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save();  // We need the validator to check if password === passwordConfirm

    // 3) Update the changePasswordAt property 

    // 4) Log the user in , send JWT token
    createSendToken(user,200,res);

    next();
})

exports.updatePassword = catchAsync(async (req,res,next)=>{

    // 1) Get user from collection

    const user = await userModel.findById(req.user.id).select('+password');


    // 2) check isPOSTed password is correct

    const correct = await user.correctPassword(req.body.passwordCurrent,user.password);
    if(!correct) return next(new AppError('Incorrect password entered!',401));


    // 3) Update password

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // userModel.findByIdAndUpdate will not work as intended as this keyword will not be defined!


    // 4) Log user in , send JWT

    createSendToken(user,200,res);

})