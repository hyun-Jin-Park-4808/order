import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptionGroupRepository } from './entities/option-group.repository';
import { OptionDetailRepository } from './entities/option-detail.repository';
import { OptionItemRepository } from './entities/option-item.repository';
import { ProductRepository } from '../product/entities/product.repository';
import { CartItemRepository } from '../cart/entities/cart-item.repository';
import { OrderOptionDetailRepository } from './entities/order-option-detail.repository';
import { OrderItemRepository } from '../order/entities/order-item.repository';
import { CartOptionDetailRepository } from './entities/cart-option-detail.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OptionGroupRepository,
            OptionDetailRepository,
            OptionItemRepository,
            OrderOptionDetailRepository,
            CartOptionDetailRepository,
            ProductRepository,
            CartItemRepository,
            OrderItemRepository,
        ])
    ],
    exports: [TypeOrmModule]
})
export class OptionModule {}
