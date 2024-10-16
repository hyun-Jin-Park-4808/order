import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberRepository } from '../member/entities/member.repository';
import { DeliveryMemoCommandController } from './controller/delivery-memo.controller.command';
import { DeliveryMemoQueryController } from './controller/delivery-memo.controller.query';
import { DeliveryMemoCommandService } from './service/delivery-memo.service.command';
import { DeliveryMemoQueryService } from './service/delivery-memo.service.query';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MemberRepository
        ]),
    ],
    controllers: [DeliveryMemoCommandController, DeliveryMemoQueryController],
    providers: [DeliveryMemoCommandService, DeliveryMemoQueryService],
    exports: [DeliveryMemoCommandService, DeliveryMemoQueryService, TypeOrmModule]
})
export class DeliveryMemoModule {}
