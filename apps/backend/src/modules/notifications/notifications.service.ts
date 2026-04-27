import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import type { Notification } from '@obrafacil/shared';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async notify(data: {
    profileId: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.repo.create(data);
  }

  async findForProfile(profileId: string): Promise<Notification[]> {
    return this.repo.findByProfile(profileId);
  }

  async countUnread(profileId: string): Promise<number> {
    return this.repo.countUnread(profileId);
  }

  async markAsRead(id: string, profileId: string): Promise<void> {
    return this.repo.markAsRead(id, profileId);
  }

  async markAllAsRead(profileId: string): Promise<void> {
    return this.repo.markAllAsRead(profileId);
  }
}
