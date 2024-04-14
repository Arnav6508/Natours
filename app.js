const path = require('path'); // built-in module
const express = require('express');
// const fs = require('fs');
const morgan = require('morgan');

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

app.set('view engine', 'pug'); // set the view engine to pug 
// pug templates are called views in express
app.set('views', path.join(__dirname, 'views')); 
// to prevent error as we don't know that the path we receive has '/' or not

// Global middlewares

// serving static files
app.use(express.static(path.join(__dirname,'public'))); // to access static file (on browser type url without writing parent folder[public in this case])


// SET security HTTP headers
app.use(helmet({ contentSecurityPolicy: false }));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// api limiting to prevent brute force attacks
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
// automatic parsing of JSON
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded( { extended: true, limit: '10kb'} ));  // parse data from url encoded form
app.use(cookieParser()); 

// data sanitization against noSQL query injection  
app.use(mongoSanitize());

// data sanitization against XSS (cross side scripting) attacks
app.use(xss());

// prevent parameter pollution
app.use(hpp({
    whitelist: [
        'duration',
        'ratingsAverage',
        "rating",
        "difficulty",
        "maxGroupSize",
        "price"
    ]  // to allow multiple values of duration
}));


// custom middleware
// will act on all request response cycles that start after its declaration
app.use((req,res,next)=>{
    req.requestTime = new Date().toISOString();
    // console.log(req.cookies);
    next();
})


// ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// check if unwanted route is baeing called
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));

  // calling for error handler middleware

  // next(err);
  // if argument is passed in next , express will know there ia an error
  // it will skip all ither middlewares and go to error handler middleware
});

app.use(globalErrorHandler);

module.exports = app;
