import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortOneAPI } from '../apis/portone.api';
import { MemberRepository } from '../member/entities/member.repository';
import { OrderRepository } from '../order/entities/order.repository';
import { ProductRepository } from '../product/entities/product.repository';
import { PaymentCommandController } from './controller/payment.controller.command';
import { PaymentCommandService } from './service/payment.service.command';
import { ConfigService } from '@nestjs/config';
import { PaymentQueryService } from './service/payment.service.query';
import { PaymentQueryController } from './controller/payment.controller.query';
import { PaymentRepository } from './entities/payment.repository';


@Module({
    imports: [
    TypeOrmModule.forFeature([
        OrderRepository,
        ProductRepository,
        MemberRepository,
        PaymentRepository,
      ])
    ],
    controllers: [PaymentQueryController, PaymentCommandController],
    providers: [PaymentCommandService, PaymentQueryService, PortOneAPI, ConfigService],
    exports: [PaymentCommandService, PaymentQueryService, PortOneAPI, TypeOrmModule]
})
export class PaymentModule {}
