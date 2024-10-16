import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartModule } from './cart/cart.module';
import { MemberModule } from './member/member.module';
import * as Joi from 'joi';
import { ProductModule } from './product/product.module';
import { HealthController } from './health/health.controller';
import { HttpExceptionFilter } from '@app/common/filters/http-exception.filter';
import { ErrorsInterceptor } from '@app/common/interceptors/error.interceptor';
import { HttpLogInterceptor } from '@app/common/interceptors/logger.interceptor';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { DeliveryModule } from './delivery/delivery.module';
import { DeliveryMemoModule } from './delivery-memo/delivery-memo.module';
import { PaymentModule } from './payment/payment.module';
import { OrderModule } from './order/order.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { OptionModule } from './option/option.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:'.env.order-api.dev',
      ignoreEnvFile: process.env.NODE_ENV === 'prod',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('dev', 'test', 'prod').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        SECRET_KEY: Joi.string().required(),
        STORE_ID: Joi.string().required(),
        CHANNEL_KEY: Joi.string().required(),
        PORTONE_API_SECRET: Joi.string().required(),
        QUEUE_URL: Joi.string().required(),
        AWS_REGION: Joi.string().required(),
        AWS_ACCESS_KEY_ID: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        PORTONE_BASE_URL: Joi.string().required(),
        SERVICE_MALL_DOMAIN: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRoot(require('./ormconfig')),
    CartModule,
    MemberModule,
    ProductModule,
    DeliveryModule,
    DeliveryMemoModule,
    PaymentModule,
    OrderModule,
    OptionModule
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorsInterceptor,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}
