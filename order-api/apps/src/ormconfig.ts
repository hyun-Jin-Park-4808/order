import * as dotenv from 'dotenv';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Cart } from './cart/entities/cart.entity';
import { CartItem } from './cart/entities/cart-item.entity';
import { Delivery } from './delivery/entities/delivery.entity';
import { DeliveryMemo } from './delivery-memo/enitities/delivery-memo.entity';
import { Member } from './member/entities/member.entity';
import { Payment } from './payment/entities/payment.entity';
import { Product } from './product/entities/product.entity';
import { Order } from './order/entities/order.entity';
import { OrderItem } from './order/entities/order-item.entity';
import { OptionGroup } from './option/entities/option-group.entity';
import { OptionDetail } from './option/entities/option-detail.entity';
import { OptionItem } from './option/entities/option-item.entity';
import { OrderOptionDetail } from './option/entities/order-option-detail.entity';
import { CartOptionDetail } from './option/entities/cart-option-detail.entity';

dotenv.config({ path: './.env.order-api.dev' });

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  const connectionOptions: TypeOrmModuleOptions = {
    type: 'mysql',
    host: config.host,
    port: parseInt(config.port as string),
    username: config.user,
    password: config.password,
    database: config.database,
    entities: [
      Cart, CartItem, 
      Delivery, DeliveryMemo, 
      Member, 
      Order, OrderItem, 
      Payment, Product,
      OptionGroup, OptionDetail, 
      OptionItem, OrderOptionDetail,
      CartOptionDetail,
    ],
    synchronize: true,
    dropSchema: false,
    migrationsRun: false,
};

export = connectionOptions;