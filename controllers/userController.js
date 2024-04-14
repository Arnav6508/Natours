const multer = require('multer');
const userModel = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const sharp = require('sharp');

// cb = call back function
// const multerStorage = multer.diskStorage({
//     destination: (req,file,cb) => {
//         cb(null,'public/img/users');  
//         // 1st arg = error if there is one
//         // 2nd arg = actual destination
//     },
//     filename: (req,file,cb)=>{
//         // 2nd arg = filename = user id + curr time stamp + extension
//         const ext = file.mimetype.split('/')[1]
//         cb(null,`user-${req.user.id}-${Date.now()}.${ext}`)
//     }
// })

const multerStorage = multer.memoryStorage()

const multerFilter = (req,file,cb)=>{
    if(file.mimetype.startsWith('image')){
        cb(null,true);
    }else{
        cb(new AppError('Not an image! Pls upload only images!',400),false);
    }
}

// const upload = multer( { dest: 'public/img/users' } ); // dest is the destination where we want to save the images we upload
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.resizeUserPhoto = catchAsync(async (req,res,next)=>{
    if(!req.file) return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`
    // filename has to be manually set while using memory storage

    await sharp(req.file.buffer)  // req.file.buffer stores image in memory storage
        .resize(500,500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);
    
    next();
})

exports.uploadUserPhoto = upload.single('photo');

const filterObj = (obj,...allowedFields)=>{
    const newObj = {};

    Object.keys(obj).forEach(ele=>{
        if(allowedFields.includes(ele)) newObj[ele] = obj[ele];
    })

    return newObj;
}

exports.createUser = (req,res)=>{ 
    res.status(404).json({
        status: 'failure',
        message: "This route is not defined! Please use sign up!"
    });
};

exports.updateMe = catchAsync(async(req,res,next)=>{ 
    // console.log(req.file, req.body);
    // multer adds data to req.file and photo is not parsed in req.body

    // 1) Create error is user POSTs password data

    if(req.body.password || req.body.passwordConfirm){
        return next(new AppError("This route is not for password updates! pls use /updateMyPassword",400))
    }


    // 2) Filtered out unwanted fields that r not allowed to be updated

    const filteredBody = filterObj(req.body,'name','email');
    if (req.file) filteredBody.photo = req.file.filename;


    // 3) Update user document

    const updatedUser = await userModel.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,             // to return the updated object instead of the old one
        runValidators: true    // invalid email etc should be caught
    });

    res.status(200).json({
        status: "success",
        user: updatedUser
    })

});

exports.deleteMe = catchAsync(async(req,res,next)=>{ 
    
    await userModel.findByIdAndUpdate(req.user.id, {active: false})

    res.status(204).json({
        status: "success",
        data: null
    })
});

exports.getMe = (req,res,next)=>{
    req.params.id = req.user.id;
    next();
}


exports.getAllUsers = factory.getAll(userModel);
exports.getUser = factory.getOne(userModel);  
// Don't update passwords with this
exports.updateUser = factory.updateOne(userModel);
exports.deleteUser = factory.deleteOne(userModel);

