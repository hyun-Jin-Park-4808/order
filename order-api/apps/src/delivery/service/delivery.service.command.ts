import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Connection, QueryRunner } from 'typeorm';
import { DeliveryInput } from '../dto/delivery.input.dto';
import { Delivery } from '../entities/delivery.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { DeliveryRepository } from '../entities/delivery.repository';
import { ModifyDeliveryInput } from '../dto/modify-delivery.input.dto';

@Injectable()
export class DeliveryCommandService {
    constructor(
        private readonly connection: Connection
    ) { }

    async addToDelivery(email: EmailInput, deliveryInput: DeliveryInput): Promise<Delivery> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            if (deliveryInput.isDefault === true) {
                await queryRunner.manager
                .getCustomRepository(DeliveryRepository)
                .changeDefaultDelivery(member.id);
            }
            const delivery = await queryRunner.manager
                .getCustomRepository(DeliveryRepository)
                .save({
                    customerName: deliveryInput.customerName,
                    phoneNumber: deliveryInput.phoneNumber,
                    isDefault: deliveryInput.isDefault,
                    address: deliveryInput.address,
                    member: member
                });

            await queryRunner.commitTransaction();
            return delivery;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async modifyDelivery(id: number, email: EmailInput, modifyDeliveryInput: ModifyDeliveryInput): Promise<Delivery> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            let delivery = await queryRunner.manager
                .getCustomRepository(DeliveryRepository)
                .getById(id);
            
            if (modifyDeliveryInput.isDefault === true) {
                await queryRunner.manager
                .getCustomRepository(DeliveryRepository)
                .changeDefaultDelivery(member.id);
            }

            delivery = {
                ...delivery, ...modifyDeliveryInput
            };

            await queryRunner.manager
                .getCustomRepository(DeliveryRepository)
                .save(delivery);

            await queryRunner.commitTransaction();
            return delivery;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async deleteDelivery(id: number, email: EmailInput): Promise<void> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            await queryRunner.manager
                .getCustomRepository(DeliveryRepository)
                .deleteDelivery(member.id, id);

            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
