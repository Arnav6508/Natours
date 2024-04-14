import axios from 'axios';
import { showAlert } from './alert'

// type is either 'password' or 'data'
exports.updateSettings = async (type,data)=>{
    try{
        const url =
            type === 'password'
                ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
                : 'http://127.0.0.1:3000/api/v1/users/updateMe';
        const res  = await axios({
            method: 'PATCH',
            data,
            url
        })
        console.log(res.data)
        if(res.data.status === 'success'){
            showAlert('success',`${type} updated successfully!`);
        }
    }catch(err){
        showAlert('error', err.response.data.message)
    }
}