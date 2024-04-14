const mongoose = require('mongoose');
const dotenv = require('dotenv');

mongoose.set('useFindAndModify', false);

///////////////// Sync Error handling //////////////////////////

process.on('uncaughtException',err=>{
    console.log('Uncaught Exception !');
    console.log(err.name,err.message);
    process.exit(1);
})


dotenv.config({path:'./config.env'}); // now process.env can be accessed from any connected file
const app = require('./app.js');

////////////// Connecting database //////////////

const DB = process.env.DATABASE.replace('<PASSWORD>',process.env.DATABASE_PASSWORD);
mongoose.connect(DB,{
    useNewUrlParser: true,
    useCreateIndex:true,
    // findOneAndUpdate:false
    useUnifiedTopology: true
}).then(con=> console.log('DB connection successful'));


////////////////  Create elements from blueprint //////////////

// const tour1 = new Tour({
//     name: 'Dunes of Arrakis',
//     rating: 5,
//     price: 100,
// })
// const tour2 = new Tour({
//     name: 'Wrath of Giedi Prime',
//     rating: 4.7,
//     price: 150,
// })

// tour1
//     .save()  // save file to model
//     .then(doc=>console.log(doc))
//     .catch(err => console.error(err))

// tour2
//     .save()
//     .then(doc=>console.log(doc))
//     .catch(err => console.error(err))


///////////////// Environment variables //////////////

// console.log(app.get('env')); // node.js sets environment variable as development
// console.log(process.env);
// u can set envionment variables from terminal by simply equating it to value


///////////////// Listening to server queries //////////////////////////

const port = process.env.PORT||3000;
const server = app.listen(port,()=>{
    console.log(`App running on port ${port}`);
})


///////////////// Async Error handling //////////////////////////

process.on('unhandledRejection',err=>{
    console.log('Unhandled Rejection !');
    console.log(err.name,err.message);

    // giver server time to finish all the requests that are 
    // pending/handled at that time and then the server is killed
    server.close(()=>{
        process.exit(1);
    })
})
