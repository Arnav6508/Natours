const express = require('express');
const authController = require('./../controllers/authController');
const userController = require('./../controllers/userController');
const router = express.Router();

router.post('/signup',authController.signup);
router.post('/login',authController.login);
router.get('/logout',authController.logout);

router.post('/forgotPassword',authController.forgotPassword);
router.patch('/resetPassword/:token',authController.resetPassword);


// since middlewares work in sequence it will protect all routes that come after it
router.use(authController.protect); 


router.patch('/updateMyPassword',authController.updatePassword);
router.patch(
    '/updateMe',
    userController.uploadUserPhoto,
    userController.resizeUserPhoto, 
    userController.updateMe
); // 'photo' is the name of the field that is going to hold the file
router.get('/me',userController.getMe,userController.getUser);
router.delete('/deleteMe',userController.deleteMe);


router.use(authController.restrictTo('admin'));


router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;