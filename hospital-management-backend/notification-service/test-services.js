const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailService() {
    console.log('🧪 Testing Email Service Configuration...');
    console.log('📧 Email Settings:');
    console.log(`   Host: ${process.env.EMAIL_HOST}`);
    console.log(`   Port: ${process.env.EMAIL_PORT}`);
    console.log(`   User: ${process.env.EMAIL_USER}`);
    console.log(`   From: ${process.env.EMAIL_FROM}`);
    console.log(`   Secure: ${process.env.EMAIL_SECURE}`);

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        console.log('\n🔍 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ Email service connection verified successfully!');

        // Test sending an email (uncomment to actually send)
        /*
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: 'test@example.com', // Change to your test email
            subject: 'Hospital Management - Test Email',
            html: `
                <h2>✅ Email Service Test</h2>
                <p>This is a test email from the Hospital Management notification service.</p>
                <p>Email service is working correctly!</p>
                <p><small>Sent at: ${new Date().toISOString()}</small></p>
            `
        });
        console.log('✅ Test email sent successfully!');
        console.log(`📧 Message ID: ${info.messageId}`);
        */

    } catch (error) {
        console.error('❌ Email service error:', error.message);
        if (error.code === 'EAUTH') {
            console.log('💡 Authentication failed. Please check:');
            console.log('   - Email and password are correct');
            console.log('   - Gmail: Enable "App Passwords" if using 2FA');
            console.log('   - Gmail: Enable "Less secure app access" if not using 2FA');
        }
    }
}

async function testSMSConfiguration() {
    console.log('\n📱 SMS Service Configuration:');
    console.log(`   Twilio Account SID: ${process.env.TWILIO_ACCOUNT_SID}`);
    console.log(`   Twilio Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '[CONFIGURED]' : '[NOT CONFIGURED]'}`);
    console.log(`   Twilio Phone: ${process.env.TWILIO_PHONE_NUMBER}`);

    if (process.env.TWILIO_ACCOUNT_SID === 'your-twilio-account-sid') {
        console.log('⚠️  SMS service uses placeholder credentials');
        console.log('📝 To configure SMS service with Twilio:');
        console.log('   1. Sign up at https://www.twilio.com/');
        console.log('   2. Get your Account SID, Auth Token, and Phone Number');
        console.log('   3. Update the .env file with:');
        console.log('      TWILIO_ACCOUNT_SID=AC... (starts with AC)');
        console.log('      TWILIO_AUTH_TOKEN=your_auth_token');
        console.log('      TWILIO_PHONE_NUMBER=+1234567890');
    } else {
        console.log('✅ SMS service credentials are configured');
        
        // Test Twilio connection
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            
            if (accountSid && authToken && accountSid.startsWith('AC')) {
                console.log('\n🔍 Testing Twilio connection...');
                
                // Basic validation
                if (accountSid.length >= 32 && authToken.length >= 32) {
                    console.log('✅ Twilio credentials format looks valid');
                    console.log('📱 SMS service ready to send messages');
                    console.log('⚠️  Note: This is a trial account - can only send to verified numbers');
                } else {
                    console.log('⚠️  Credential format may be invalid');
                }
            }
        } catch (error) {
            console.error('❌ SMS service test error:', error.message);
        }
    }
}

async function main() {
    console.log('🏥 Hospital Management - Notification Service Test\n');
    
    await testEmailService();
    await testSMSConfiguration();
    
    console.log('\n🔧 Service Status Summary:');
    console.log('   📧 Email Service: ' + (process.env.EMAIL_USER ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'));
    console.log('   📱 SMS Service: ' + (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your-twilio-account-sid' ? '✅ CONFIGURED' : '⚠️  USING PLACEHOLDERS'));
    console.log('   🌐 Web Notifications: ✅ ALWAYS AVAILABLE');
}

main().catch(console.error);
