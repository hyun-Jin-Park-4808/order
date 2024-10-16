import { Injectable } from '@nestjs/common';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Delivery } from '../entities/delivery.entity';
import { Connection, QueryRunner } from 'typeorm';
import { MemberRepository } from '../../member/entities/member.repository';
import { DeliveryRepository } from '../entities/delivery.repository';
import { SortColumn } from '../../common/dto/input-for-pagination.dto';
import { GetDeliveriesInput } from '../dto/get-deliveries.input.dto';
import { SortOrder } from '@app/common/enum/sort.enum';

@Injectable()
export class DeliveryQueryService {
    constructor(
        private readonly connection: Connection
    ) { }

    async getDefaultDelivery(email: EmailInput): Promise<Delivery> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            const result = await queryRunner.manager
                .getCustomRepository(DeliveryRepository)
                .getDefaultByMemberId(member.id);

            await queryRunner.commitTransaction();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getDeliveries({
        sortColumn = SortColumn.ID,
        sortOrder = SortOrder.DESC,
        ...inputs }
        : GetDeliveriesInput): Promise<[Delivery[], number]> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(inputs.email);

            const [deliveries, totalCount] = await
                queryRunner.manager
                    .getRepository(Delivery)
                    .createQueryBuilder('deliveries')
                    .where('deliveries.memberId = :memberId', { memberId: member.id })
                    .orderBy({
                        [`deliveries.${sortColumn}`]: sortOrder
                    })
                    .skip((inputs.pageNumber - 1) * inputs.pageSize)
                    .take(inputs.pageSize)
                    .getManyAndCount();

            await queryRunner.commitTransaction();
            return [deliveries, totalCount];
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
