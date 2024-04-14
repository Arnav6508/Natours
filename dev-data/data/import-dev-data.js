const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

const tourModel = require('./../../models/tourModel.js');
const userModel = require('./../../models/userModel.js');
const reviewModel = require('./../../models/reviewModel.js');

dotenv.config({path:'./config.env'}); // now process.env can be accessed from any connected file

////////////// Connecting database //////////////

const DB = process.env.DATABASE.replace('<PASSWORD>',process.env.DATABASE_PASSWORD);
mongoose.connect(DB,{
    useNewUrlParser: true,
    useCreateIndex:true,
    // findOneAndUpdate:false
    useUnifiedTopology: true
}).then(con=> console.log('DB connection successful'));


////////////// Delete and Create functions //////////////

const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`,'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`,'utf-8'));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`,'utf-8'));

const importData = async ()=>{
    try{
        await tourModel.create(tours);
        await userModel.create(users, { validateBeforeSave: false });
        await reviewModel.create(reviews);
        console.log('data added');
    }catch(err){
        console.error(err);
    }
    process.exit();
}

const deleteData = async ()=>{
    try{
        await tourModel.deleteMany();
        await userModel.deleteMany();
        await reviewModel.deleteMany();
        console.log('data deleted');
    }catch(err){
        console.error(err);
    }
    process.exit();
}


////////////// Function calls //////////////

// console.log(process.argv); // gives address of all arguments in terminal query
if (process.argv[2] === '--import') importData();
if (process.argv[2] === '--delete') deleteData();

// to delete data  from datase run : node ./dev-data/data/import-dev-data.js --delete
