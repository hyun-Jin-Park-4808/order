import { SortOrder } from '@app/common/enum/sort.enum';
import { Injectable } from '@nestjs/common';
import { SortColumn } from '../../common/dto/input-for-pagination.dto';
import { Connection, QueryRunner } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { GetPaymentsInput } from '../dto/get-payments.input.dto';
import { MemberRepository } from '../../member/entities/member.repository';
import { OrderRepository } from '../../order/entities/order.repository';
import { EmailInput } from '../../member/dto/email.input.dto';
import { PaymentRepository } from '../entities/payment.repository';
import { ConfigService } from '@nestjs/config';
import { EnvironmentDto } from '../dto/environment.dto';

@Injectable()
export class PaymentQueryService {
    constructor(
        private readonly connection: Connection,
        private readonly configService: ConfigService,
    ) { }

    async getPayments({
        sortColumn = SortColumn.ID,
        sortOrder = SortOrder.DESC,
        ...inputs }
        : GetPaymentsInput, orderId: number): Promise<[Payment[], number]> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(inputs.email);

            await queryRunner.manager
                .getCustomRepository(OrderRepository)
                .validateOrder(orderId);

            const [payments, totalCount] = await
                queryRunner.manager
                    .getRepository(Payment)
                    .createQueryBuilder('payments')
                    .where('payments.orderId = :orderId', { orderId: orderId })
                    .orderBy({
                        [`payments.${sortColumn}`]: sortOrder
                    })
                    .skip((inputs.pageNumber - 1) * inputs.pageSize)
                    .take(inputs.pageSize)
                    .getManyAndCount();
            ;

            await queryRunner.commitTransaction();
            return [payments, totalCount];
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getPayment(payementId: number, email: EmailInput): Promise<Payment> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(email.email);

            const result = await
                queryRunner.manager
                    .getCustomRepository(PaymentRepository)
                    .getById(payementId);

            await queryRunner.commitTransaction();
            return result;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }


    async getEnvironment(email: EmailInput): Promise<EnvironmentDto> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            console.log("service start");
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(email.email);

            const result: EnvironmentDto = {
                storeId: this.configService.get<string>('STORE_ID'),
                channelKey: this.configService.get<string>('CHANNEL_KEY')
            }

            console.log(result);

            await queryRunner.commitTransaction();
            return result;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
