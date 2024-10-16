import { SortOrder } from '@app/common/enum/sort.enum';
import { Injectable } from '@nestjs/common';
import { EmailInput } from '../../member/dto/email.input.dto';
import { Connection, QueryRunner } from 'typeorm';
import { SortColumn } from '../../common/dto/input-for-pagination.dto';
import { GetOrdersInput } from '../dto/get-orders.input.dto';
import { Order } from '../entities/order.entity';
import { MemberRepository } from '../../member/entities/member.repository';
import { OrderRepository } from '../entities/order.repository';

@Injectable()
export class OrderQueryService {
    constructor(
        private readonly connection: Connection
    ) { }

    async getOrder(email: EmailInput, orderId: number): Promise<Order> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(email.email);

            const result = await queryRunner.manager
                .getCustomRepository(OrderRepository)
                .getDetailsById(orderId);

            await queryRunner.commitTransaction();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getOrders({
        sortColumn = SortColumn.ID,
        sortOrder = SortOrder.DESC,
        ...inputs }
        : GetOrdersInput): Promise<[Order[], number]> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(inputs.email);

            const [orders, totalCount] = await
                queryRunner.manager
                    .getRepository(Order)
                    .createQueryBuilder('orders')
                    .where('orders.memberId = :memberId', { memberId: member.id })
                    .orderBy({
                        [`orders.${sortColumn}`]: sortOrder
                    })
                    .skip((inputs.pageNumber - 1) * inputs.pageSize)
                    .take(inputs.pageSize)
                    .getManyAndCount();
            
            await queryRunner.commitTransaction();
            return [orders, totalCount];
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
