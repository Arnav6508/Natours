
class APIFeatures{
    constructor(query,queryStr){
        this.query = query;
        this.queryStr= queryStr;
    }

    filter(){
        const queryObj = {...this.queryStr};   // copy of req.query

        const exclude = ['limit','page','sort','fields'];
        exclude.forEach(ele=> delete queryObj[ele]);


        // ADVANCED FILTERING 

        //{ difficulty: 'easy', duration: { $gte: '5' } } // mongodb style
        //{ difficulty: 'easy', duration: { gte: '5' } }  // obtained from postman

        let queryString = JSON.stringify(queryObj);
        queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g,match=>`$${match}`)
        // /()/ => regular expression -> for powerful pattern matching and rplace operations
        // \b => word boundary -> exact vahi string ereplace krega and not part of some other string
        // g => globally check krega and will replace all instamces of those strings

        //  METHOD 1

        this.query = this.query.find(JSON.parse(queryString));
        // let query = tourModel.find(JSON.parse(queryStr)); 

        // METHOD 2 
        // const query =  tourModel
        //                     .find()  // now it is a query
        //                     .where('duration')
        //                     .equals(5)
        //                     .where('difficulty')
        //                     .equals('easy');

        return this;
    }

    sort(){
         // console.log(req.query);
         if(this.queryStr.sort){
            const sortBy = this.queryStr.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);  // sort() is query method query = instance of model
        }else{
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    limitFields(){
        if(this.queryStr.fields){
            const fields = this.queryStr.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        }else{
            this.query = this.query.select('-__v');
        }
        return this;
    }

    pagination(){
        const page = +this.queryStr.page || 1;
        const limit = +this.queryStr.limit || 100;
        const skip = (page-1)*limit;

        this.query = this.query.skip(skip).limit(limit);

        // if(this.queryStr.page){
        //     const numTours = await tourModel.countDocuments();
        //     if(skip>=numTours) throw new Error('This page does not exist');
        // }

        return this;
    }
}

module.exports = APIFeatures;