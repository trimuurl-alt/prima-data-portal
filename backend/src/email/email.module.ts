import { Global, Module, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend?: Resend;
  private smtp?: nodemailer.Transporter;
  private from: string;
  private logToConsole: boolean;
  private mode: 'resend' | 'smtp' | 'console';

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('SMTP_FROM') ?? 'no-reply@example.com';
    this.logToConsole = this.config.get('EMAIL_LOG_TO_CONSOLE') === 'true';

    const resendKey = this.config.get<string>('RESEND_API_KEY');
    const smtpHost = this.config.get<string>('SMTP_HOST');

    if (this.logToConsole) {
      this.mode = 'console';
    } else if (resendKey) {
      this.resend = new Resend(resendKey);
      this.mode = 'resend';
      this.logger.log('Email transport: Resend HTTP API');
    } else if (smtpHost) {
      const port = Number(this.config.get('SMTP_PORT') ?? 587);
      this.smtp = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS'),
        },
      });
      this.mode = 'smtp';
      this.logger.log('Email transport: SMTP');
    } else {
      this.mode = 'console';
      this.logger.warn('No email transport configured — falling back to console');
    }
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (this.mode === 'console') {
      this.logger.log(`\n────── EMAIL (console mode) ──────`);
      this.logger.log(`To:      ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(`Body:\n${text ?? html.replace(/<[^>]+>/g, '')}`);
      this.logger.log(`──────────────────────────────────\n`);
      return;
    }

    try {
      if (this.mode === 'resend' && this.resend) {
        const result = await this.resend.emails.send({
          from: this.from,
          to,
          subject,
          html,
          ...(text ? { text } : {}),
        });
        if (result.error) {
          this.logger.error(`Resend rejected email to ${to}: ${JSON.stringify(result.error)}`);
        } else {
          this.logger.log(`✉  Email sent to ${to} — id: ${result.data?.id}`);
        }
      } else if (this.mode === 'smtp' && this.smtp) {
        const info = await this.smtp.sendMail({ from: this.from, to, subject, html, text });
        this.logger.log(`✉  Email sent to ${to} — messageId: ${info.messageId}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }

  async sendInvite(to: string, name: string, inviteUrl: string): Promise<void> {
    const subject = 'Welcome to Prima Data Portal — Set your password';
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a6b4a">Prima Data Portal</h2>
        <p>Hi ${name},</p>
        <p>You've been invited to access the Prima Data Portal. Click the link below to set your password and activate your account:</p>
        <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#1a6b4a;color:#fff;text-decoration:none;border-radius:6px">Set up my account</a></p>
        <p style="color:#6b7280;font-size:13px">This link expires in 7 days.<br>If you didn't expect this email, you can ignore it.</p>
      </div>`;
    return this.send(to, subject, html);
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
    const subject = 'Prima Data Portal — Password reset request';
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a6b4a">Password reset</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the link below to set a new one:</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#1a6b4a;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p>
        <p style="color:#6b7280;font-size:13px">This link expires in 1 hour.<br>If you didn't request this, you can ignore this email.</p>
      </div>`;
    return this.send(to, subject, html);
  }
}

@Global()
@Module({ providers: [EmailService], exports: [EmailService] })
export class EmailModule {}