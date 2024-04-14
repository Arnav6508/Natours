const nodemailer = require("nodemailer");
// const pug = require('pug');
// const {convert} = require('html-to-text');

// module.exports = class Email {
//     constructor(user,url){
//         this.to = user.email;
//         this.firstName = user.name.split(' ')[0];
//         this.url = url;
//         this.from = `Arnav Gupta <${process.env.EMAIL_FROM}>`;
//     }

//     newTransport(){
//         if (process.env.NODE_ENV==='production'){
//             // sendgrid
//             return 1;
//         }
        
//         // nodemailer
//         return nodemailer.createTransport({
//             // service: 'Gmail',
//             host: process.env.EMAIL_HOST,
//             port: process.env.EMAIL_PORT,
//             auth: {
//                 user: process.env.EMAIL_USERNAME,
//                 pass: process.env.EMAIL_PASSWORD
//             }
//         })
//     }

//     async send(template,subject){
//         // render html based on pug template
//         // res.render() will not be used as we don't want to render just create html and send it
//         const html = pug.renderFile(`${__dirname}/../views/emails/${template}.pug`,{
//             firstName: this.firstName,
//             url: this.url,
//             subject
//         })

//         // define email options
//         const mailOptions = {
//             from: this.from,
//             to: this.to,
//             subject,
//             html,
//             text: convert(html),
//         }

//         // return the transporter and send email
//         await this.newTransport().sendMail(mailOptions);

//     }

//     async sendWelcome(){
//         await this.send('welcome','Welcome to natours family!');
//     }
// }



// NODEMAILER

const sendEmail = async options=>{

    // 1) Create a transporter

    const transporter = nodemailer.createTransport({
        // service: 'Gmail',
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    })

    // 2) Define email options

    const mailOptions = {
        from: 'Arnav Gupta <hello@arnav.io>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: 
    }

    // 3) Actually send the email

    await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;