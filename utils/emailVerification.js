const crypto = require('crypto');
const axios = require('axios');

const SENDER = { name: 'Home Services', email: 'azizlouhichi81@gmail.com' };

const sendEmail = async (to, subject, htmlContent) => {
  await axios.post('https://api.brevo.com/v3/smtp/email', {
    sender: SENDER,
    to: [{ email: to }],
    subject,
    htmlContent
  }, {
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  console.log(`Email "${subject}" sent to ${to}`);
};

const generateVerificationToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

const sendVerificationEmail = async (email, token, role = 'user') => {
  const base = process.env.BASE_URL || 'https://daycareback-production.up.railway.app';
  const endpoint = role === 'prestataire' ? 'prestataire/verify-email' : 'auth/verify-email';
  const verificationUrl = `${base}/api/${endpoint}?token=${token}`;

  await sendEmail(email, 'Verify Your Email', `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #3498db, #2ecc71); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to Home Services!</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Please verify your email to complete registration</p>
      </div>
      <div style="padding: 40px;">
        <p style="color: #34495e; margin-bottom: 25px; text-align: center; font-size: 18px;">Click below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: #3498db; color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; box-shadow: 0 4px 15px rgba(52,152,219,0.3);">
            Verify Email
          </a>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f1f1; color: #95a5a6; font-size: 14px; text-align: center;">
          <p style="margin: 0;">If you didn't request this email, you can safely ignore it.</p>
          <p style="margin: 10px 0 0;">© ${new Date().getFullYear()} Home Services. All rights reserved.</p>
        </div>
      </div>
    </div>
  `);
};

const sendOtpEmail = async (email, otp) => {
  await sendEmail(email, 'Password Reset OTP', `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #0474ED, #0258C4); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 26px;">Password Reset</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Home Services</p>
      </div>
      <div style="padding: 40px; text-align: center;">
        <p style="color: #555; font-size: 16px; margin-bottom: 24px;">Use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="display: inline-block; background: #f0f6ff; border: 2px dashed #0474ED; border-radius: 12px; padding: 20px 40px; margin: 0 auto;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #0474ED;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 13px; margin-top: 30px;">If you didn't request this, ignore this email.</p>
      </div>
    </div>
  `);
};

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendOtpEmail,
  sendEmail
};
