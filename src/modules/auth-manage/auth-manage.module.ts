import { Module } from '@nestjs/common';
import { UsersAccountModule } from './user-accounts/user-accounts.module';
import { AccessModule } from './access-control/access.module';

@Module({
  imports: [AccessModule, UsersAccountModule],
  exports: [AccessModule, UsersAccountModule],
})
export class AuthManageModule {}
