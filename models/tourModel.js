const mongoose = require('mongoose');
const slugify = require("slugify");
// const validator = require("validator");

const userModel = require('./userModel');
// const reviewModel = require('./reviewModel');


////////////////  Mongoose (Creating schema and model ) //////////////

const tourSchema = new mongoose.Schema({

    name: {
        type: String,
        required: [true,'name required'], // second arg is to be printed when value left empty
        unique: true,
        trim:true,
        maxlength: [40,'Tour name must have less or equal to 40 characters'],
        minlength: [6,'Tour name must have more or equal to 6 characters'],
        // validate: [validator.isAlpha,'Tour name must only contain characters'],
    },

    duration:{
        type: Number,
        required:[true,'duration required']
    },

    slug:{
        type: String
    },

    maxGroupSize:{
        type: Number,
        required:[true,'Group Size required']
    },

    difficulty: {
        type: String,
        trim: true,
        default: [true,'difficulty required'],
        enum: {
            values : ['easy','medium','difficult'],
            message :  "difficulty level should be easy ,medium or difficult"
        } // this is the complete format in contrast to that used in default above
    },

    rating: {
        type: Number,
        default: 4,
    },

    ratingsAverage: {
        type: Number,
        default: 4,
        min: [1,'Rating must be above 1'],
        max: [5,'Rating must be below 5'],
        set: val => Math.round(val*10)/10 // runs each time there is new value for this field
    },

    ratingsQuantity: {
        type: Number,
        default: 0,
    },

    price: {
        type: Number,
        required: [true,'price required'],
    },

    priceDiscount: {
        type: Number,
        validate:{
            validator : function(val){
                // this keyword  only works on SAVE and CREATE
                // this keyword only points to curr document on NEW document creation not on UPDATE
                return  val<this.price;
            },
            message : "Discount price {VALUE} should be below regular price"
        }
    }, 

    summary:{
        type:String,
        required:[true,'summary req'],
        trim:true
    },

    description:{
        type:String,
        trim:true
    },

    imageCover:{
        type:String,
        required:[true,'image req'],
        trim:true
    },

    images: [String],

    createdAt: {
        type: Date,
        default: Date.now(),
        select: false   // will not be printed when instance is displayed by query.select()
    },

    startDates: [Date],

    secretTour: {
        type: Boolean,
        default: false,
    },

    startLocation:{
        // GeoJSON
        type: {
            type: String,
            default: 'Point',
            enum: ['Point'],
        },
        coordinates: [Number],  // takes first val as lng second as lat
        address: String,
        description: String
    },

    locations:[
        {
            type : {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number], 
            address: String,
            description: String,
            day: Number
        }
    ],

    guides: [
        {
            type: mongoose.Schema.ObjectId,
            ref: userModel
        }
    ]

},
{
    toJSON: { virtuals: true},
    toObject: { virtuals: true}
})

tourSchema.virtual('weeks').get(function(){
    return this.duration/7;
})


// IMPROVE TIME COMPLEXITY OF QUERY USING PRICE FOR QUERY FILTERING
tourSchema.index( { price: 1 }); // 1 = ascending sorting
tourSchema.index( { price: 1, ratingsAverage: -1 });
tourSchema.index( { slug: 1 });
tourSchema.index( { startLocation: '2dsphere' });

//Virtual Populate
tourSchema.virtual('reviews',{
    ref: 'Review',        // VERY IMP : Import krne ki zaroorat nhi hai file name same hona chahiye
    foreignField: 'tour',
    localField: '_id'
})

///////////////// DOCUMENT MIDDLEWARE : runs b4 .save() and .create()

// here save is a hook
// so this below one is a pre-save hook

tourSchema.pre('save',function(next){
    // console.log(this);
    this.slug = slugify( this.name , { lower:true } );
    next();
})

// tourSchema.post('save',function(doc,next){
//     // console.log(doc);
//     doc.slug = slugify( doc.name, { lower:true } );
//     next();
// })


// EMBEDDING USER IN TOUR
// tourSchema.pre('save', async function(next){
//     const guidesPromise = this.guides.map(async id=> await userModel.findById(id));
//     this.guides = await Promise.all(guidesPromise);
//     next();
// })


///////////////// QUERY MIDDLEWARE

tourSchema.pre(/^find/,function(next){
    this.find( { secretTour: { $ne : true } } );  // false and not equal to true are diff
    this.start = Date.now();
    // console.log(this);  // this keyword points to query
    next();
})

// tourSchema.post(/^find/,function(docs,next){
//     console.log(`query takes ${Date.now()-this.start} milliseconds`); 
//     next();
// })

tourSchema.pre(/^find/,function(next){
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });
    next();
})

///////////////// AGGREGATION MIDDLEWARE

// tourSchema.pre('aggregate',function(next){
//     console.log(this); // this keyword points to aggregate object
//     console.log(this.pipeline());
//     this.pipeline().unshift({ $match : { secretTour : { $ne : true } } })
//     next();
// })

///////////////// MODEL MIDDLEWARE (not important 🙂)

const TourModel = mongoose.model('Tour',tourSchema);

module.exports = TourModel;