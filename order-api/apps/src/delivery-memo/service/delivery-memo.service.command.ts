import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Connection, QueryRunner } from 'typeorm';
import { DeliveryMemoInput } from '../dto/delivery-memo.input.dto';
import { DeliveryMemo } from '../enitities/delivery-memo.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { DeliveryMemoRepository } from '../enitities/delivery-memo.repository';

@Injectable()
export class DeliveryMemoCommandService {
    constructor(
        private readonly connection: Connection
    ) { }

    async saveDeliveryMemo(email: EmailInput, deliveryMemoInput: DeliveryMemoInput): Promise<DeliveryMemo> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            const deliveryMemo = await queryRunner.manager
                .getCustomRepository(DeliveryMemoRepository)
                .save({
                    memo: deliveryMemoInput.memo,
                    member: member
                });

            await queryRunner.commitTransaction();
            return deliveryMemo;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async deleteDeliveryMemo(email: EmailInput, id: number): Promise<void> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            await queryRunner.manager
                .getCustomRepository(DeliveryMemoRepository)
                .deleteMemo(member.id, id);

            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
