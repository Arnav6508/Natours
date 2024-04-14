const mongoose = require('mongoose');
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require('crypto'); // built-in node module

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'User name is required']
    },

    email: {
        type: String,
        required: [true,'Email is required'],
        unique: true,
        lowercase: true, // will convert it to lowercase
        validate: [validator.isEmail,'Please enter a valid email']
    },

    photo: {
        type: String,
        default: 'default.jpg'
    },

    role: {
        type: String,
        enum: ['user','guide','lead-guide','admin'],
        deault: "user"
    },

    password: {
        type:String,
        required: [true,'Password is required'],
        minlength : [8,'Minimum length of the password should be 8 characters'],
        select:false
    },

    passwordConfirm: {
        type:String,
        required: [true,'Password entered is incorrect'],
        validate: {
            // this keyword  only works on SAVE and CREATE
            // this keyword only points to curr document on NEW document creation not on UPDATE
            validator: function(ele){
                return ele === this.password;
            },
            message: "Passwords are not the same"
        }
    },

    passwordChangedAt: Date,

    passwordResetToken: String,
    passwordResetExpire: Date,

    active: {
        type: Boolean,
        default: true,
        select: false
    }

})

userSchema.pre("save",async function(next){
    // only run this func if password was actually modified
    if(!this.isModified('password')) return next();
    
    // hash pwd with cost of 12
    this.password = await bcrypt.hash(this.password,12);  // second arg = salt : length of string added to pwd
    this.passwordConfirm = undefined;

    next();
})

userSchema.pre('save',function(next){
    if(!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now()-1000;
    next();
})


// /^find/ -> regular expression that gives any query that starts with find 
userSchema.pre(/^find/,function(next){

    // this keyword points to curr query

    this.find( {active: { $ne : false } });
    next();
})

// instance method (available on documents of a collection)

userSchema.methods.correctPassword = async function(candidatePassword,userPassword){
    return await bcrypt.compare(candidatePassword, userPassword);
}

userSchema.methods.createPasswordResetToken = async function(){
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    console.log({resetToken},this.passwordResetToken);

    this.passwordResetExpire = Date.now() + 10*60*1000;

    return resetToken;
}

userSchema.methods.changesPasswordAfter = function(JWTTimestamp){
    if(this.passwordChangedAt){
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime()/1000,10);
        return changedTimeStamp>JWTTimestamp; 
    }

    // false means not changed => time at which token was issued should be less than changed time stamp
    return false;
}

const UserModel = mongoose.model('User',userSchema);

module.exports = UserModel;