const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter =  require('./reviewRoutes');

const router = express.Router();

// parameter middleware
// router.param('id', tourController.checkID);


router.use('/:tourId/reviews',reviewRouter);  // use method for mounting a router

router.route('/top-5-cheap').get(tourController.top5,tourController.getAllTours);

router.route('/tour-stats').get(tourController.aggregation);

router
  .route('/monthly-stats/:year')
  .get(
    authController.protect,
    authController.restrictTo(['admin','lead-guide','guide']),
    tourController.monthlyStats
  );

router
    .route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(tourController.getTourWithin);
//another way : tours-distance?distamce=233&center=-40,45&unit=mi

router
    .route('/distance/:latlng/unit/:unit')
    .get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo(['admin','lead-guide']),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo(['admin','lead-guide']),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo(['admin','lead-guide']),
    tourController.deleteTour
  );

module.exports = router;
