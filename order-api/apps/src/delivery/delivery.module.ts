import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberRepository } from '../member/entities/member.repository';
import { DeliveryCommandController } from './controller/delivery.controller.command';
import { DeliveryQueryService } from './service/delivery.service.query';
import { DeliveryQueryController } from './controller/delivery.controller.query';
import { DeliveryCommandService } from './service/delivery.service.command';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MemberRepository
        ]),
    ],
    controllers: [DeliveryCommandController, DeliveryQueryController],
    providers: [DeliveryCommandService, DeliveryQueryService],
    exports: [DeliveryCommandService, DeliveryQueryService, TypeOrmModule]
})
export class DeliveryModule {}
