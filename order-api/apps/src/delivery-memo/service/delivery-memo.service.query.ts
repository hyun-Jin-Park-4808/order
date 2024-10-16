import { Injectable } from '@nestjs/common';
import { Connection, QueryRunner } from 'typeorm';
import { GetDeliveryMemosInput } from '../dto/get-delivery-memos.input.dto';
import { DeliveryMemo } from '../enitities/delivery-memo.entity';
import { SortColumn } from '../../common/dto/input-for-pagination.dto';
import { SortOrder } from '@app/common/enum/sort.enum';
import { MemberRepository } from '../../member/entities/member.repository';
import { EmailInput } from 'apps/src/member/dto/email.input.dto';
import { DeliveryMemoRepository } from '../enitities/delivery-memo.repository';

@Injectable()
export class DeliveryMemoQueryService {
    constructor(
        private readonly connection: Connection
    ) { }

    async getDeliveryMemos({
        sortColumn = SortColumn.ID,
        sortOrder = SortOrder.DESC,
        ...inputs }: GetDeliveryMemosInput): Promise<[DeliveryMemo[], number]> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(inputs.email);

            // 페이징처리 하기 
            const [deliveryMemos, totalCount] = await
                queryRunner.manager
                    .getRepository(DeliveryMemo)
                    .createQueryBuilder('deliveryMemos')
                    .where('deliveryMemos.memberId = :memberId', { memberId: member.id })
                    .orderBy({
                        [`deliveryMemos.${sortColumn}`]: sortOrder
                    })
                    .skip((inputs.pageNumber - 1) * inputs.pageSize)
                    .take(inputs.pageSize)
                    .getManyAndCount();

            // 트랜잭션 커밋
            await queryRunner.commitTransaction();
            return [deliveryMemos, totalCount];
        } catch (error) {
            // 오류 발생 시 롤백
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            // QueryRunner 해제
            await queryRunner.release();
        }
    }

    async getRecentDeliveryMemo(email: EmailInput): Promise<DeliveryMemo> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            const recentDeliveryMemo = await queryRunner.manager
                    .getCustomRepository(DeliveryMemoRepository)
                    .getRecentMemo(member.id);

            // 트랜잭션 커밋
            await queryRunner.commitTransaction();
            return recentDeliveryMemo;
        } catch (error) {
            // 오류 발생 시 롤백
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            // QueryRunner 해제
            await queryRunner.release();
        }
    }
}
