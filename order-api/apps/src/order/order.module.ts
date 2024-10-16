import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceMallAPI } from '../apis/service-mall.api';
import { CartItemRepository } from '../cart/entities/cart-item.repository';
import { MemberRepository } from '../member/entities/member.repository';
import { OrderOptionDetailRepository } from '../option/entities/order-option-detail.repository';
import { ProductRepository } from '../product/entities/product.repository';
import { OrderCommandController } from './controller/order.controller.command';
import { OrderQueryController } from './controller/order.controller.query';
import { OrderItemRepository } from './entities/order-item.repository';
import { OrderRepository } from './entities/order.repository';
import { OrderCommandService } from './service/order.service.command';
import { OrderQueryService } from './service/order.service.query';

@Module({
  imports: [
    TypeOrmModule.forFeature([
        MemberRepository, OrderRepository, 
        CartItemRepository, ProductRepository, OrderItemRepository,
        OrderOptionDetailRepository, OrderOptionDetailRepository,
    ])
],
controllers: [OrderCommandController, OrderQueryController],
providers: [OrderCommandService, OrderQueryService, ServiceMallAPI],
exports: [OrderCommandService, OrderQueryService, ServiceMallAPI, TypeOrmModule]
})
export class OrderModule {}
