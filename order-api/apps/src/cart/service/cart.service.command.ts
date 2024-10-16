import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OptionDetailRepository } from '../../option/entities/option-detail.repository';
import { Connection, QueryRunner } from 'typeorm';
import { EmailInput } from '../../member/dto/email.input.dto';
import { MemberRepository } from '../../member/entities/member.repository';
import { ItemInput } from '../../product/dto/product.item.input.dto';
import { ProductRepository } from '../../product/entities/product.repository';
import { CartItemsInput } from '../dto/cart-items.input.dto';
import { ModifyCartItemInput } from '../dto/modify-cart-item.input.dto';
import { CartItem } from '../entities/cart-item.entity';
import { CartItemRepository } from '../entities/cart-item.repository';
import { Cart } from '../entities/cart.entity';
import { CartRepository } from '../entities/cart.repository';
import { OptionItemRepository } from '../../option/entities/option-item.repository';
import { OptionItem } from '../../option/entities/option-item.entity';

@Injectable()
export class CartCommandService {
    constructor(
        private readonly connection: Connection
    ) { }

    async addToCart(email: EmailInput,
        { optionItemInputs, ...cartItemInput }: ItemInput): Promise<Cart> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            const product = await queryRunner.manager
                .getCustomRepository(ProductRepository)
                .getById(cartItemInput.productId);

            let createOptionItems = [];

            if (!cartItemInput.quantity && !optionItemInputs) {
                throw new BadRequestException('quantity is missing.');
            }

            if (optionItemInputs) {
                for (const optionItemInput of optionItemInputs) {
                    let createCartOptionDetails = [];
                    const optionDetails = await queryRunner.manager
                        .getCustomRepository(OptionDetailRepository)
                        .getByIds(optionItemInput.optionDetailIds);

                    for (const optionDetail of optionDetails) {
                        if (optionDetail.optionGroup.product.id !== product.id) {
                            throw new BadRequestException(
                                `Not same product, ${optionDetail.optionGroup.product.id} != ${product.id}`
                            );
                        }
                        createCartOptionDetails.push({ optionDetail: optionDetail });
                    }

                    createOptionItems = [...createOptionItems, {
                        optionQuantity: optionItemInput.optionQuantity,
                        cartOptionDetails: createCartOptionDetails,
                    }];
                }
            }

            const createCartItem = {
                product: product,
                quantity: cartItemInput.quantity || 0,
                optionItems: createOptionItems
            };

            let cart = await queryRunner.manager
                .getCustomRepository(CartRepository)
                .getByEmail(email.email);

            const createCartInput = cart ?
                {
                    ...cart, member,
                    cartItems: [...cart?.cartItems, createCartItem]
                } : {
                    member,
                    cartItems: [createCartItem]
                };

            cart = await queryRunner.manager
                .getCustomRepository(CartRepository)
                .save(createCartInput);

            await queryRunner.commitTransaction();
            return cart;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async modifyCartItem(email: EmailInput,
        { optionItemInputs, ...modifyCartItemInput }: ModifyCartItemInput): Promise<CartItem> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(email.email);

            let cartItem = await queryRunner.manager
                .getCustomRepository(CartItemRepository)
                .getById(modifyCartItemInput.cartItemId);

            let optionItem: OptionItem;
            let updateOptionItems = cartItem.optionItems;

            if (modifyCartItemInput.optionItemId) {
                optionItem = await queryRunner.manager
                    .getCustomRepository(OptionItemRepository)
                    .getById(modifyCartItemInput.optionItemId);
                optionItem.optionQuantity =
                    modifyCartItemInput.optionQuantity || optionItem.optionQuantity;
                const optionItemIndex = updateOptionItems.findIndex(
                    (item) => item.id === optionItem.id
                );
                if (optionItemIndex !== -1) {
                    updateOptionItems[optionItemIndex] = optionItem;
                } else {
                    throw new NotFoundException(`Not found option item. id: ${optionItem.id}`);
                }
            }

            cartItem.quantity =
                modifyCartItemInput.quantity || cartItem.quantity;

            let addOptionItems = [];

            if (optionItemInputs) {
                addOptionItems = await Promise
                    .all(optionItemInputs
                        .map(async (optionItemInput) => {
                            const optionDetails = await queryRunner.manager
                                .getCustomRepository(OptionDetailRepository)
                                .getByIds(optionItemInput.optionDetailIds);

                            const createCartOptionDetails = optionDetails
                                .map(optionDetail => ({ optionDetail }));

                            return {
                                optionQuantity: optionItemInput.optionQuantity,
                                cartOptionDetails: createCartOptionDetails,
                            };
                        }));
            }

            // if (optionItemInputs) {
            //     for (const optionItemInput of optionItemInputs) {
            //         let createCartOptionDetails = [];
            //         const optionDetails = await queryRunner.manager
            //             .getCustomRepository(OptionDetailRepository)
            //             .getByIds(optionItemInput.optionDetailIds);

            //         for (const optionDetail of optionDetails) {
            //             createCartOptionDetails.push({ optionDetail: optionDetail });
            //         }

            //         addOptionItems = [...addOptionItems, {
            //             optionQuantity: optionItemInput.optionQuantity,
            //             cartOptionDetails: createCartOptionDetails,
            //         }];
            //     }
            // }

            updateOptionItems = [...updateOptionItems, ...addOptionItems];

            const modifyCartItem =
            {
                ...cartItem,
                optionItems: updateOptionItems
            };

            const modifiedCartItem = await queryRunner.manager
                .getCustomRepository(CartItemRepository)
                .save(modifyCartItem);

            await queryRunner.commitTransaction();
            return modifiedCartItem;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async deleteCartItems(email: EmailInput, deleteCartItemsInput: CartItemsInput): Promise<CartItem[]> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(email.email);

            const cartItems = await queryRunner.manager
                .getCustomRepository(CartItemRepository)
                .getByIds(deleteCartItemsInput.itemIds);

            for (const cartItem of cartItems) {
                cartItem.isDeleted = true;
                await queryRunner.manager
                    .getCustomRepository(CartItemRepository)
                    .save(cartItem);
            }

            await queryRunner.commitTransaction();
            return cartItems;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
