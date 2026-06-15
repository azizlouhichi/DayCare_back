const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;
  
  try {
    await transporter.sendMail({
      from: `"Day Care Services" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email',
      html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #3498db, #2ecc71); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to Daycare!</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Please verify your email to complete registration</p>
      </div>
      
      <div style="padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        
        <p style="color: #34495e; margin-bottom: 25px; text-align: center; font-size: 18px;">Click below to verify your email address:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: #3498db; color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; transition: all 0.3s; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);">
            Verify Email
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f1f1; color: #95a5a6; font-size: 14px; text-align: center;">
          <p style="margin: 0;">If you didn't request this email, you can safely ignore it.</p>
          <p style="margin: 10px 0 0;">© ${new Date().getFullYear()} Daycare. All rights reserved.</p>
        </div>
      </div>
    </div>
    `
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = {
  generateVerificationToken,
  sendVerificationEmail
};