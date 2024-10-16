import { SortOrder } from '@app/common/enum/sort.enum';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Connection, QueryRunner } from 'typeorm';
import { MemberRepository } from '../../member/entities/member.repository';
import { GetCartItemsInput } from '../dto/get-cart-items.input.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartRepository } from '../entities/cart.repository';
import { SortColumn } from '../../common/dto/input-for-pagination.dto';

@Injectable()
export class CartQueryService {
    constructor(
        private readonly connection: Connection
    ) { }

    async getCartItems({
        sortColumn = SortColumn.ID,
        sortOrder = SortOrder.DESC,
        ...inputs}
        : GetCartItemsInput): Promise<[CartItem[], number]> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(inputs.email);

            // 멤버에 해당하는 카트 찾기
            let cart = await queryRunner.manager
                .getCustomRepository(CartRepository)
                .getByEmail(inputs.email);

            if (!cart) {
                throw new BadRequestException(`Not found cart, email: ${inputs.email}`);
            } 
            // 페이징처리 하기 
            const [cartItems, totalCount] = await
                queryRunner.manager
                    .getRepository(CartItem)
                    .createQueryBuilder('cartItems')
                    .innerJoinAndSelect('cartItems.product', 'product')
                    .leftJoinAndSelect('cartItems.optionItems', 'optionItems')
                    .leftJoinAndSelect('optionItems.cartOptionDetails', 'cartOptionDetails')
                    .leftJoinAndSelect('cartOptionDetails.optionDetail', 'optionDetail')
                    .leftJoinAndSelect('optionDetail.optionGroup', 'optionGroup')
                    .where('cartItems.cartId = :cartId', {cartId: cart.id})
                    .andWhere('cartItems.isDeleted = :isDeleted', { isDeleted: false })
                    .orderBy({
                        [`cartItems.${sortColumn}`]: sortOrder
                    })
                    .skip((inputs.pageNumber - 1) * inputs.pageSize)
                    .take(inputs.pageSize)
                    .getManyAndCount();
                    ;

            await queryRunner.commitTransaction();
            return [cartItems, totalCount];
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
