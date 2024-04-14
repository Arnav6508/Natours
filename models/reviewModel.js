const mongoose = require('mongoose');
const userModel = require('./userModel');
const tourModel = require('./tourModel');


const reviewSchema = new mongoose.Schema({
    review:{
        type: String,
        required: [true,'Review cannot be empty!'],
        minlength: [5,'too short title']
    },

    rating:{
        type: Number,
        required: true,
        min: [1,'Rating must be above 1'],
        max: [5,'Rating must be below 5'],
    },

    createdAt:{
        type: Date,
        default: Date.now()
    },

    tour:{
        type: mongoose.Schema.ObjectId,
        ref: tourModel,
        required: [true,'Review must belong to a tour!']
    },

    user:{
        type: mongoose.Schema.ObjectId,
        ref: userModel,
        required: [true,'Review must have an author!']
    }

},
{
    toJSON: { virtuals: true},
    toObject: { virtuals: true}
})


reviewSchema.index( { tour: 1, user: 1 }, { unique: true })

reviewSchema.pre(/^find/,function(next){
    this.populate({
        path: 'user',
        select: 'name photo'
    })
    next();
})


reviewSchema.statics.calcAverageRatings = async function(tourId){
    const stats = await this.aggregate([  // this point to the model
        {
            $match: {tour: tourId}
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating:  { $avg: '$rating'}
            }
        }
    ]);
    // console.log(stats);

    if(stats.length>0){
        await tourModel.findByIdAndUpdate(tourId,{
        ratingsQuantity: stats[0].nRating,
        ratingsAverage: stats[0].avgRating
        })
    }else{
        await tourModel.findByIdAndUpdate(tourId,{
        ratingsQuantity: 0,
        ratingsAverage: 4.5
        })
    }
}

// post middleware does not get access to next
reviewSchema.post('save',function(){
    // using post as matching can be done only after data has been saved in model
    // this points to curr review
    // document ke constructor pe lgao for static methods
    this.constructor.calcAverageRatings(this.tour);  // this.constructor is the model that created the doc
})


// findOneAndUpdate and findOneAndDelete  are methods provided by mongoose on Query object
reviewSchema.pre(/^findOneAnd/,async function(next){
    this.r = await this.findOne();
    // console.log(this.r);
    next();
})

reviewSchema.post(/^findOneAnd/,async function(){
    // await this.findOne() does NOT work here as the query has already been executed
    await this.r.constructor.calcAverageRatings(this.r.tour);
})


const reviewModel = mongoose.model('Review',reviewSchema);

module.exports = reviewModel;