// const fs = require('fs');
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`,'utf-8'));
const tourModel = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

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

// upload.single('photo') for single file upload -> req.file
// upload.array('images',maxCount: 3) for multiple file upload -> req.files
// upload.fields for mix of single and multiple files -> req.files
exports.uploadTourImages = upload.fields([
    {name: 'imageCover', maxCount: 1},
    {name: 'images', maxCount: 3},
]);

exports.resizeTourImages = catchAsync(async (req,res,next) => {
    // console.log(req.files);

    if (!req.files.imageCover || !req.files.images) return next();

    // 1) Cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)  // req.file.buffer stores image in memory storage
        .resize(2000,1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);

    // 2) images
    req.body.images = []
    // map saves all 3 promises in array and promise.all awaits all promises together
    await Promise.all(
        req.files.images.map(async (file,i)=>{
            const filename = `tour-${req.params.id}-${Date.now()}-${i+1}.jpeg`;

            await sharp(req.files.images[i].buffer)  // req.file.buffer stores image in memory storage
            .resize(2000,1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`public/img/tours/${filename}`);

            req.body.images.push(filename);
        })
    )

    // console.log(req.body);
    next();
})

////////////////  Mongoose Style of implementing functions  //////////////

const display = function(tourData,res){
    return res.status(200).json({
        status: 'success',
        data : {
            tourData
        }
    });
}

exports.top5 = (req,res,next)=>{
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,difficulty';
    next();
}

exports.getAllTours = factory.getAll(tourModel);
exports.getTour = factory.getOne(tourModel,'reviews');
exports.createTour = factory.createOne(tourModel);
exports.updateTour = factory.updateOne(tourModel);
exports.deleteTour = factory.deleteOne(tourModel);

exports.getTourWithin = catchAsync(async (req,res,next)=>{
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit === 'mi' ? distance/3963.2 : distance/6378.1;
    
    if(!lat || !lng) next(new AppError('Please provide in the format lat,lng',400));

    const tours = await tourModel.find(
        { startLocation: { $geoWithin: { $centerSphere: [[ lng, lat ], radius] } } });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data : {
            data: tours
        }
    });
})

exports.getDistances = catchAsync(async (req,res,next)=>{
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    if(!lat || !lng) next(new AppError('Please provide in the format lat,lng',400));

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001 ;

    const tours = await tourModel.aggregate([
        {
        // if there is only one field with geospatial index then in will use it
        // if there are multiple fields then keys paramter need to be used to specify the field being used
        // in this case , startLocation will be used
        // always use geonear as the first operator in the pipeline(inc all middleware pipelines)
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng*1,lat*1]
                },
                distanceField: 'distance', // is in metres
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ])

    display(tours,res);
})


// AGGREGATION PIPELINE IMPLEMENTATION

// $match , $group , etc are aggregation stages
// $gte , $sum , $avg , etc are aggregation operators

exports.aggregation = catchAsync(async (req,res)=>{
    const stats = await tourModel.aggregate([
        {
            $match : { ratingsAverage : { $gte : 4.5} }
        },
        {
            $group : {
                _id : "$difficulty",
                numTours : { $sum : 1 },
                numRatings : { $sum : "$ratingsQuantity"},
                avgRating : { $avg : "$ratingsAverage"},
                avgPrice : { $avg : "$price" },
                minPrice : { $min : "$price" },
                maxPrice : { $max : "$price" },
            }
        },
        {
            $sort : {
                avgPrice : 1
            }
        }
    ])
    display(stats,res);
})


// USING AGGREGATION TO FIND MONTHLY STATS OF ANY YEAR

exports.monthlyStats = catchAsync(async (req,res)=>{
    const year= req.params.year;
    const stats = await tourModel.aggregate([
        {
            $unwind : "$startDates"  // to open/unwind array of data
        },
        {
            $match :{ startDates:{
                $gte : new Date(`${year}-01-01`),
                $lte : new Date(`${year}-12-31`)
            }
            }
        },
        {
            $group : {
                _id : { $month : "$startDates"},
                numTours : { $sum : 1},
                numRatings : { $sum : "$ratingsQuantity"},
                avgRating : { $avg : "$ratingsAverage"},
                avgPrice : { $avg : "$price" },
                minPrice : { $min : "$price" },
                maxPrice : { $max : "$price" },
            }
        },
        {
            $addFields : {
                month  : "$_id"
            }
        },
        {
            $project : {
                _id : 0
            }
        },
        {
            $sort : {
                numTours : -1
            }
        },
        {
            $limit : 6
        }
    ])
    display(stats,res);
})

////////////////  Express Middlewares  //////////////

// exports.checkBody = (req,res,next)=>{
//     if(!req.body?.name ||!req.body?.price ){
//         return res.status(400).json({
//             status: 'failure',
//             message: "Missing name or price !"
//         });
//     }
//     next();
// }

// exports.checkID = (req,res,next,id)=>{
//     console.log('param middleware used');
//     if(id<0 || id>tours.length-1){
//         return res.status(400).json({
//             status: 'failure',
//             data : {
//                 "message" : 'Invalid ID'
//             }
//         })
//     }next();
// }


// exports.getAllTours = (req,res)=>{ 
//     res.json({
//         status: 'success',
//         results : tours.length,
//         data : {
//             tours
//         }
//     });
// };

// exports.createTour = (req,res)=>{
//     const newId = tours[tours.length-1].id+1;
//     const newTour = (req.body);
//     newTour.id = newId;
//     // const newTour = Object.assign({id:newId},req.body);
//     tours.push(newTour);
//     fs.writeFile(`${__dirname}/dev-data/data/tours-simple.json`,JSON.stringify(tours),err=>{
//         res.json({
//             status:"success",
//             data:{
//                 tours:newTour
//             }
//         })
//     })
// }

// exports.getTour= (req,res)=>{  // :id? for optional parameter
    
//     const id = +req.params.id;
//     console.log(id);

//     const tour = tours.find(el=>el.id===id);
    
//     res.json({
//         status: 'success',
//         data : {
//             tour
//         }
//     });
// }

// exports.updateTour = (req,res)=>{ 
    
//     const id = +req.params.id;

//     const tour = tours.find(el=>el.id===id);
//     const newTour = Object.assign(tour,req.body);

//     fs.writeFile(`${__dirname}/dev-data/data/tours-simple.json`,JSON.stringify(tours),err=>{
//         res.status(200).json({
//             status: 'success',
//             data : {
//                 tour
//             }
//         });
//     })
// }

// exports.deleteTour = (req,res)=>{

//     const id = +req.params.id;

//     // const newTours = tours.filter(el=>el.id!==id);

//     fs.writeFile(`${__dirname}/dev-data/data/tours-simple.json`,JSON.stringify(newTours),err=>{
//         res.status(204).json({   // 204 = no content
//             status: 'success',
//             data : null
//         })
//     })

// }