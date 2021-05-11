const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
    const oauth2Client = new OAuth2(
        process.env.gmailClientId,
        process.env.gmailClientSecret,
        "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.gmailRefreshToken
    });

    const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
            if (err) {
                reject("Failed to create access token :(");
		console.log(err);
            }
            resolve(token);
        });
    });

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.gmailId,
            accessToken,
            clientId: process.env.gmailClientId,
            clientSecret: process.env.gmailClientSecret,
            refreshToken: process.env.gmailRefreshToken
        }
    });

    return transporter;
};

const sendEmail = async (emailOptions) => {
    let emailTransporter = await createTransporter();
    await emailTransporter.sendMail(emailOptions);
    const thisTime = new Date();
    const timeString = thisTime.toDateString() + ", " + thisTime.toTimeString(); 
    console.log(`- Status mail sent to ${process.env.recipients} - last updated ${timeString}`);
}

module.exports = {
    sendEmail: sendEmail
};
