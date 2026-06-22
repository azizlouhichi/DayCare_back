const crypto = require('crypto');
const { Resend } = require('resend');

const generateVerificationToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.BASE_URL || 'https://daycareback-production.up.railway.app'}/api/auth/verify-email?token=${token}`;
  if (process.env.AUTO_VERIFY_EMAIL === 'true') {
    console.log(`[DEV] Skipping email — verify manually: ${verificationUrl}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'Day Care <onboarding@resend.dev>',
    to: email,
    subject: 'Verify Your Email',
    html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #3498db, #2ecc71); padding: 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to Daycare!</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">Please verify your email to complete registration</p>
      </div>
      <div style="padding: 40px;">
        <p style="color: #34495e; margin-bottom: 25px; text-align: center; font-size: 18px;">Click below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background: #3498db; color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);">
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

  if (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }

  console.log(`Verification email sent to ${email}`);
};

module.exports = {
  generateVerificationToken,
  sendVerificationEmail
};
