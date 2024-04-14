import axios from 'axios';
import { showAlert } from './alert';

export const login = async (email,password)=>{
    try{
        const res = await axios({
            method: 'POST',
            url: 'http://127.0.0.1:3000/api/v1/users/login',
            data: {
                email,
                password
            }
        })
        if(res.data.status === 'success'){
            showAlert('success','Logged in successfully');
            window.setTimeout(()=>{
                location.assign('/')
            },1500);
        }
    }catch(err){
        showAlert('error',"Incorrect email or password!");
    }
}

export const logout = async () => {
    try{
        const res = await axios({
            method: 'GET',
            url: 'http://127.0.0.1:3000/api/v1/users/logout',
        });
        if (res.data.status === 'success'){
            // location.reload(true) // true is passed to bypass the cache so that we know for sure that jwt token is deleted
            // since jwt is destroyed in above "thing" we can simply relocate the user to home screen right after sign out
            location.assign('/')
        }
    }catch(err){
        showAlert('error', 'Error logging out! Try again.');
    }
}

