const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

const display = function(data,res,code){
    return res.status(code).json({
        status: 'success',
        data 
    });
}

exports.deleteOne = Model => catchAsync(async function(req,res,next){
    const id = req.params.id;
    const doc = await Model.findByIdAndDelete(id);

    if(!doc){
        return next(new AppError('No document found with that ID',404));
    }
    
    display(null,res,204);
})

exports.updateOne = Model => catchAsync(async function(req,res,next){
    const id = req.params.id;
    const doc = await Model.findByIdAndUpdate(id,req.body,{
        new:  true, // returns the updated object rather than the original one.
        runValidators : true
    }); // third arg is options read mongoose docs 

    if(!doc){
        return next(new AppError('No doc found with that ID',404));
    }

    display(doc,res,200);
})

exports.createOne = Model=>catchAsync(async function(req,res){
    const doc = await Model.create(req.body); 
    display(doc,res,200);
})

exports.getOne = (Model,popOptions) => catchAsync(async function(req,res,next){

    let query = Model.findById(req.params.id);
    if(popOptions) query = query.populate(popOptions);
    const doc = await query;
    // const doc = await Model.findOne({_id:req.params.id});

    if(!doc){
        return next(new AppError('No doc found with that ID',404));
    }

    display(doc,res,200);
})

exports.getAll = Model => catchAsync(async function(req,res){

    // Allow for nested GET reviews on tour
    let filterObj = {};
    if(req.params.tourId) filterObj = { tour:req.params.tourId };

    // EXECUTE QUERY
    const features = new APIFeatures(Model.find(filterObj),req.query)
        .filter()
        .sort()
        .limitFields()
        .pagination();
    // const doc = await features.query.explain();
    const doc = await features.query;
    
    // DISPLAY DOC
    res.status(200).json({
        status: 'success',
        results: doc.length,
        data : {
            data : doc
        }
    });
})
