const nodemailer = require('nodemailer');

async function testSmtp() {
  console.log('Testing SMTP connection...');
  
  // Use the credentials from .env.prod
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'thecontinuum.solutions@gmail.com',
      pass: 'ttfuuobmccuybemv' // App password
    }
  });

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log('✅ SMTP Connection successful!');

    // Send a test email
    const info = await transporter.sendMail({
      from: '"Continuum HR" <thecontinuum.solutions@gmail.com>',
      to: 'kiran.11.05.05@gmail.com', // Sending to the super admin email
      subject: 'Continuum SMTP Test',
      text: 'Hello! If you are reading this, your Gmail SMTP configuration is working perfectly in Continuum.',
      html: '<b>Hello!</b><br>If you are reading this, your Gmail SMTP configuration is working perfectly in Continuum.'
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP Test failed:');
    console.error(error);
  }
}

testSmtp();
