import dotenv from 'dotenv';
dotenv.config();

import emailService from '../api/services/email.service.js';

async function main() {
  const recipientEmail = process.argv[2] || process.env.ADMIN_EMAIL || 'test@example.com';

  console.log('\n==============================================');
  console.log('       NEST CARE CONNECT — MSG91 EMAIL TESTER   ');
  console.log('==============================================');

  const config = emailService.getPublicConfig();
  console.log('\nConfiguration Status:');
  console.log('----------------------------------------------');
  console.log(`• Live Key Configured : ${config.isLiveConfigured ? '✅ YES (Live MSG91 API)' : '⚠️ NO (Simulated Test Mode)'}`);
  console.log(`• Sender Email        : ${config.senderEmail}`);
  console.log(`• Sender Name         : ${config.senderName}`);
  console.log(`• Verified Domain     : ${config.domain}`);
  console.log(`• Test Recipient      : ${recipientEmail}`);
  console.log('----------------------------------------------\n');

  console.log(`Sending test email to ${recipientEmail}...`);

  const result = await emailService.sendEmail({
    to: { email: recipientEmail, name: 'Valued Tester' },
    subject: '🌿 Test Email from Nest Care Connect',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #237A3B; margin-top: 0;">🌿 Nest Care Connect</h2>
        <p>Congratulations! Your transactional email integration is working properly.</p>
        <p style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 12px; border-radius: 8px; color: #166534; font-size: 13px;">
          <strong>Mode:</strong> ${config.isLiveConfigured ? 'Live MSG91 Delivery' : 'Simulated Test Mode'}<br/>
          <strong>Timestamp:</strong> ${new Date().toLocaleString()}
        </p>
        <p style="font-size: 12px; color: #6b7280;">This test was initiated via the Nest Care Connect diagnostic tool.</p>
      </div>
    `,
    eventType: 'ORDER_STATUS_UPDATE',
    variables: {
      customer_name: 'Valued Customer',
      notification_message: 'Your order has been confirmed and is being processed with care for your loved ones.',
      order_number: 'NCC-2026-TEST',
      order_status: 'Confirmed',
      tracking_number: 'NIMBUS-TRK-882910',
      courier_name: 'NimbusPost Express',
      tracking_url: 'https://nestcareconnect.com/orders',
      order_url: 'https://nestcareconnect.com/orders',
      button_url: 'https://nestcareconnect.com/orders',
    },
  });

  console.log('\nResult:');
  console.log('----------------------------------------------');
  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`• Mode                : ${result.mode}`);
    console.log(`• Provider Status     : ${result.status || 'Accepted'}`);
    console.log(`• Provider Message ID : ${result.providerMessageId || result.notificationId || 'N/A'}`);
    console.log(`• Database Log ID     : ${result.notificationId || 'N/A'}`);
    if (result.mode === 'MSG91_LIVE') {
      console.log(`\n📬 Check your inbox at: ${recipientEmail}`);
      console.log('   (Also check Spam/Promotions folder if sending for the first time)');
    } else if (config.isLiveConfigured) {
      console.log('\nℹ️ Running in Simulated Mode because MSG91 requires a template_id in MSG91 dashboard.');
      console.log('   Create a template under MSG91 > Email > Templates (with variable {{{body}}}),');
      console.log('   then set MSG91_DEFAULT_TEMPLATE_ID="your_template_id" in .env.');
    } else {
      console.log('\nℹ️ Running in Simulated Mode because MSG91_AUTH_KEY is not yet set in .env.');
      console.log('   Add MSG91_AUTH_KEY="your_key" to .env to send live emails.');
    }
  } else {
    console.log('❌ FAILED:');
    console.log(`• Error : ${result.error}`);
    console.log('\nTroubleshooting tips:');

    if (result.error && (result.error.includes('418') || result.error.includes('Unauthorized'))) {
      let currentIp = 'checking...';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = (await ipRes.json()) as any;
        currentIp = ipData.ip;
      } catch (_) {}
      console.log(`\n⚠️  MSG91 IP RESTRICTION (apiError 418):`);
      console.log(`• Your current outbound IP is: ${currentIp}`);
      console.log(`• Go to MSG91 Dashboard > AuthKey > Click on your Key (584213AVsRJfGl6ae05e43P1)`);
      console.log(`• Add "${currentIp}" (or subnet "${currentIp.split('.').slice(0, 3).join('.')}.0/24") to the IP Whitelist.`);
    } else {
      console.log('1. Verify your MSG91_AUTH_KEY has no extra spaces or quotes.');
      console.log('2. Ensure your sending domain (MSG91_DOMAIN) is verified under MSG91 > Email > Domains.');
      console.log('3. Ensure your sender email (MSG91_SENDER_EMAIL) is authorized in MSG91.');
    }
  }
  console.log('==============================================\n');
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
