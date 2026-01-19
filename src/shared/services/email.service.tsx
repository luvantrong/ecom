import { Injectable } from '@nestjs/common';
// import OTPEmail from 'emails/otp';
import path from 'path';
import { Resend } from 'resend';
import envConfig from 'src/shared/config';
import fs from 'fs';

const otpTemplate = fs.readFileSync(
  path.resolve('src/shared/email-templates/otp.html'),
  { encoding: 'utf-8' },
);

@Injectable()
export class EmailService {
  private resend: Resend;
  constructor() {
    this.resend = new Resend(envConfig.RESEND_API_KEY);
  }
  async sendOTP(payload: { email: string; code: string }) {
    const subject = 'Mã OTP';
    return this.resend.emails.send({
      from: 'Ecommerce <onboarding@resend.dev>',
      to: [payload.email],
      subject: subject,
      html: otpTemplate
        .replaceAll('{{subject}}', subject)
        .replaceAll('{{code}}', payload.code),
      // react: <OTPEmail otpCode={payload.code} title={subject} />,
    });
  }
}
