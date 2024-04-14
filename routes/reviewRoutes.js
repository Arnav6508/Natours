const express = require('express');
const router = express.Router({ mergeParams: true });  // to be able to access tourId

const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

router.use(authController.protect);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.setTourUserId,
        reviewController.createReview
    );

router
    .route('/:id')
    .get(reviewController.getReview)
    .delete(authController.restrictTo(['user','admin']),reviewController.deleteReview)
    .patch(authController.restrictTo(['user','admin']),reviewController.updateReview);

module.exports = router;