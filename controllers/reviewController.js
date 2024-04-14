const reviewModel = require('./../models/reviewModel');
const factory = require('./handlerFactory');


exports.setTourUserId = (req,res,next)=>{
    // Allowed nested routes
    if(!req.body.tour) req.body.tour = req.params.tourId;
    if(!req.body.user) req.body.user = req.user.id;  

    next();
}

exports.getAllReviews = factory.getAll(reviewModel);
exports.getReview = factory.getOne(reviewModel);
exports.createReview = factory.createOne(reviewModel);
exports.updateReview = factory.updateOne(reviewModel);
exports.deleteReview = factory.deleteOne(reviewModel);