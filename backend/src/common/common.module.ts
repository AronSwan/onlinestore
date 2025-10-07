import { Module } from '@nestjs/common';
import { ApiKeyGuard } from './guards/security.guard';

@Module({
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class CommonModule {}
