const tourModel = require('./../models/tourModel');
const userModel = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError')

exports.getOverview = catchAsync(async (req,res)=>{

    // 1) Get tour data from collection
    const tours = await tourModel.find()

    // 2) Build template
    // 3) Render template 
    res.status(200).render('overview',{
        tours
    })
})

exports.getTour = catchAsync(async (req,res,next)=>{

    // 1) get the data, for the tour as well as tour guides and reviews
    const tour = await tourModel.findOne({slug: req.params.slug}).populate({
        path:'reviews',
        fields: 'review rating user'
    });

    if(!tour){
        return next(new AppError('There is no tour with that name!',404))
    }

    // 2) Build template

    // 3) Render template using data from 1)
    res.status(200).render('tour',{
        tour
    })
})

exports.getLoginForm = catchAsync(async (req,res)=>{
    res.status(200).render('login',{
        title: "Log into your account",
    })
})

exports.getAccount = (req,res)=>{
    res.status(200).render('account',{
        title: "Your account",
    })
}

// exports.updateUserData = async (req,res,next) => {
//     const updatedUser = await userModel.findByIdAndUpdate(req.user.id,{
//         name: req.body.name,
//         email: req.body.email
//     },
//     {
//         new: true,
//         runValidators: true
//     });
//     res.status(200).render('account',{
//         title: "Your account",
//         user: updatedUser
//     })
// }
