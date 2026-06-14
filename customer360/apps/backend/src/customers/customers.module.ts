import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../entities/customer.entity';
import { Order } from '../entities/order.entity';
import { CustomerIdentityMap } from '../entities/customer-identity-map.entity';
import { SegmentMembership } from '../entities/segment-membership.entity';
import { Communication } from '../entities/communication.entity';
import { AgentsModule } from '../agents/agents.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Order,
      CustomerIdentityMap,
      SegmentMembership,
      Communication,
    ]),
    AgentsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
