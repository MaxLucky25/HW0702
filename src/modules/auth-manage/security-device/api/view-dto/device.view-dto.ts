import { Session } from '../../domain/session.entity';

export class DeviceViewDto {
  deviceId: string;

  title: string;

  ip: string;

  lastActiveDate: string;

  static mapToView(session: Session): DeviceViewDto {
    return {
      deviceId: session.deviceId,
      title: this.parseUserAgent(session.userAgent),
      ip: session.ip,
      lastActiveDate: session.lastActiveDate.toISOString(),
    };
  }

  private static parseUserAgent(userAgent: string): string {
    // Один regex для всех браузеров
    const match = userAgent.match(
      /(Chrome|Firefox|Safari|Edg|OPR|Opera)\/(\d+)/,
    );
    return match ? `${match[1]} ${match[2]}` : 'Unknown Browser';
  }
}
