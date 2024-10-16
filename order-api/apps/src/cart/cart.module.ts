import { Module } from '@nestjs/common';
import { CartCommandController } from './controller/cart.controller.command';
import { CartCommandService } from './service/cart.service.command';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartRepository } from './entities/cart.repository';
import { CartItemRepository } from './entities/cart-item.repository';
import { ProductRepository } from '../product/entities/product.repository';
import { MemberRepository } from '../member/entities/member.repository';
import { OrderItemRepository } from '../order/entities/order-item.repository';
import { CartQueryController } from './controller/cart.controller.query';
import { CartQueryService } from './service/cart.service.query';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CartRepository,
      CartItemRepository,
      ProductRepository,
      MemberRepository,
      OrderItemRepository,
    ])
  ],
  controllers: [CartCommandController, CartQueryController],
  providers: [CartCommandService, CartQueryService],
  exports: [CartCommandService, CartQueryService, TypeOrmModule]
})
export class CartModule {}
