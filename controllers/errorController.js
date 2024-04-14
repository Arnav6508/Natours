const AppError = require('./../utils/appError');

const handleJWTError = () => new AppError('Invalid token! Pls login again',401);

const handleJWTExpiredError = ()=>new AppError('Token expired! Pls login again',401);


const sendErrorDev = (err,req,res)=>{
    // API
    if(req.originalUrl.startsWith('./api')){
        return res.status(err.statusCode).json({
            status : err.status,
            error: err,
            message : err.message,
            stack: err.stack
        })
    }else{
        // Rendered error
        console.error('ERROR : ',err);
        return res.status(err.statusCode).render('error',{
            title: 'Something went wrong!',
            msg: err.message
        })
    }
}

const sendErrorProd = (err,req,res)=>{
    // API
    if(req.originalUrl.startsWith('./api')){
        // Operational/trusted error : send message to client
        if(err.isOperational){
            return res.status(err.statusCode).json({
                status : err.status,
                message : err.message
            })
        }
        // programming or other unkown error : don,t leak error details to client
        else{

            console.error('ERROR : ',err);
            
            // send a generic message
            return res.status(500).json({
                status: 'error',
                message:'Something went wrong'
            })
        }
    }
    // Rendered error
    if(err.isOperational){
        return res.status(err.statusCode).render('error',{
            title: 'Something went wrong!',
            msg: err.message
        })
    }
    else{
        // log error
        console.error('ERROR : ',err);
        
        // send a generic message
        return res.status(err.statusCode).render('error',{
            title: 'Something went wrong!',
            msg: 'Pls try again later!'
        })
    }
}

const handleCastErrorDB = err=>{
    const message = `Invalid ${err.path} : ${err.value}`;
    return new AppError(message,400);
}

const handleDuplicateFieldsDB = err=>{
    const value = err.errmsg.match(/"(.*?)"/);
    const message = `Duplicate field value: ${value[0]} . Please use another value`;
    return new AppError(message,400);
}

const handleValidationErrorDB = err=>{
    const errors = Object.values(err.errors).map(el=>el.message);
    const message = `Invalid input data : ${errors.join(' ; ')}`;
    return new AppError(message,400);
}

// 4 arguments = error handler middleware
module.exports = (err,req,res,next)=>{
    // console.log(err.stack); // shows where error occured
    
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if(process.env.NODE_ENV==='development'){
        sendErrorDev(err,req,res);
    }
    
    else if(process.env.NODE_ENV==='production'){

        if(err.name==='CastError') err = handleCastErrorDB(err); // CastError
        if(err.code===11000) err = handleDuplicateFieldsDB(err); // MongoError
        if(err.name==='ValidationError') err = handleValidationErrorDB(err);
        if(err.name==='JsonWebTokenError') err = handleJWTError();
        if(err.name==='TokenExpiredError') err = handleJWTExpiredError();

        sendErrorProd(err,req,res);
    }
}

