import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductRepository } from './entities/product.repository';
import { ProductController } from './controller/product.controller';
import { ProductService } from './service/product.service';
import { MemberRepository } from '../member/entities/member.repository';
import { OrderItemRepository } from '../order/entities/order-item.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ProductRepository,
            MemberRepository,
            OrderItemRepository
        ]),
    ],
    exports: [TypeOrmModule, ProductService],
    controllers: [ProductController],
    providers: [ProductService]
})
export class ProductModule {}
