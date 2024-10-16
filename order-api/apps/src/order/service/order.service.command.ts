import { ServiceProductSellingStatus } from '@app/common/entities/product/service-product.entity';
import { BadRequestException, Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { Connection } from 'typeorm/connection/Connection';
import { ServiceMallAPI } from '../../apis/service-mall.api';
import { CartItem } from '../../cart/entities/cart-item.entity';
import { CartItemRepository } from '../../cart/entities/cart-item.repository';
import { EmailInput } from '../../member/dto/email.input.dto';
import { MemberRepository } from '../../member/entities/member.repository';
import { OptionDetailRepository } from '../../option/entities/option-detail.repository';
import { Product } from '../../product/entities/product.entity';
import { ProductRepository } from '../../product/entities/product.repository';
import { CartItemsOrderInput } from '../dto/cart-items.order.input.dto';
import { ProductsOrderInput } from '../dto/products.order.input.dto';
import { RefundInput } from '../dto/refund.input.dto';
import { OrderItemRepository } from '../entities/order-item.repository';
import { Order, OrderStatus, RefundShippingFeeType, ReversalType } from '../entities/order.entity';
import { OrderRepository } from '../entities/order.repository';
import { OrderItem, OrderItemStatus } from '../entities/order-item.entity';

@Injectable()
export class OrderCommandService {
    constructor(
        private readonly connection: Connection,
        private readonly serviceMallApi: ServiceMallAPI,
    ) { }

    async orderCartItems(email: EmailInput,
        { itemIds, ...cartItemsOrderInput }: CartItemsOrderInput): Promise<Order> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            let cartItems = await queryRunner.manager
                .getCustomRepository(CartItemRepository)
                .getWithDetailByIds(itemIds);

            const totalShippingFee = cartItems
                .reduce((arr, cartItem) => {
                    if (!arr.includes(cartItem.product.brandName)) {
                        arr.push(cartItem.product.shippingFee);
                    }
                    return arr;
                }, [])
                .reduce((total, cost) => total + cost, 0);

            if (cartItemsOrderInput.shippingFee !== totalShippingFee) {
                throw new BadRequestException(`shippingFee is not correct. 
                        expectedShippingFee: ${cartItemsOrderInput.shippingFee}, realShippingFee: ${totalShippingFee}`);
            }

            const order = await queryRunner.manager
                .getCustomRepository(OrderRepository)
                .save({ ...cartItemsOrderInput, member });

            for (let cartItem of cartItems) {
                const serviceProduct = (await this.serviceMallApi
                    .getProduct(cartItem.product.id)).data;
                if (serviceProduct.sellingStatus !== ServiceProductSellingStatus.OPEN) {
                    throw new BadRequestException(`Not Selling Prouct, productId: ${serviceProduct.id}`)
                }

                cartItem.product = await queryRunner.manager
                    .getCustomRepository(ProductRepository)
                    .save({
                        ...cartItem.product, ...serviceProduct,
                        shippingFee: cartItem.product.shippingFee
                    });
                let totalOptionPrice = 0;
                let optionQuantity = 0;
                let createOrderOptionDetails = [];
                if (cartItem.optionItems && cartItem.optionItems.length > 0) {
                    for (const optionItem of cartItem.optionItems) {
                        optionQuantity = optionItem.optionQuantity;
                        createOrderOptionDetails = [];
                        totalOptionPrice = 0;
                        for (const cartOptionDetail of optionItem.cartOptionDetails) {
                            const createOrderOptionDetail = {
                                optionValue: cartOptionDetail.optionDetail.optionValue,
                                optionPrice: cartOptionDetail.optionDetail.optionPrice,
                                optionType: cartOptionDetail.optionDetail.optionGroup.optionType,
                                optionName: cartOptionDetail.optionDetail.optionGroup.optionName,
                                optionDetail: cartOptionDetail.optionDetail
                            }
                            totalOptionPrice += cartOptionDetail.optionDetail.optionPrice;
                            createOrderOptionDetails.push(createOrderOptionDetail);
                        }
                        await saveOrderItem(cartItem, totalOptionPrice,
                            optionQuantity, order, createOrderOptionDetails);
                    }
                } else {
                    await saveOrderItem(cartItem, totalOptionPrice,
                        optionQuantity, order, createOrderOptionDetails);
                }
            }
            await queryRunner.commitTransaction();
            return order;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }

        async function saveOrderItem(cartItem: CartItem, totalOptionPrice: number,
            optionQuantity: number, order: Order, createOrderOptionDetails: any[]) {
            const quantity = optionQuantity !== 0 ? optionQuantity : cartItem.quantity;
            await queryRunner.manager
                .getCustomRepository(OrderItemRepository)
                .save({
                    brandName: cartItem.product.brandName,
                    discountRate: cartItem.product.discountRate,
                    productName: cartItem.product.productName,
                    productCode: cartItem.product.productCode,
                    price: (cartItem.product.price + totalOptionPrice) * quantity,
                    salePrice: (cartItem.product.salePrice + totalOptionPrice) * quantity,
                    quantity: quantity,
                    product: cartItem.product,
                    order: order,
                    orderOptionDetails: createOrderOptionDetails
                });
        }
    }

    async orderProducts(email: EmailInput, {
        optionItemInputs, ...productsOrderInput
    }: ProductsOrderInput): Promise<Order> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const member = await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .getByEmail(email.email);

            const serviceProduct =
                (await this.serviceMallApi.getProduct(productsOrderInput.productId)).data;
            if (serviceProduct.sellingStatus !== ServiceProductSellingStatus.OPEN) {
                throw new BadRequestException(`Not Selling Prouct, productId: ${serviceProduct.id}`)
            }
            let product = await queryRunner.manager
                .getCustomRepository(ProductRepository)
                .getById(productsOrderInput.productId);

            product = await queryRunner.manager
                .getCustomRepository(ProductRepository)
                .save({
                    ...product, ...serviceProduct,
                    shippingFee: product.shippingFee
                });

            if (!productsOrderInput.quantity && !optionItemInputs) {
                throw new BadRequestException('quantity is missing.');
            }

            const order = await queryRunner.manager
                .getCustomRepository(OrderRepository)
                .save({
                    ...productsOrderInput, member,
                    shippingFee: product.shippingFee
                });

            let productQuantity = productsOrderInput.quantity || 0;
            let totalOptionPrice = 0;
            let createOrderOptionDetails = [];
            let optionQuantity = 0;
            if (optionItemInputs && optionItemInputs.length > 0) {
                for (const optionItemInput of optionItemInputs) {
                    optionQuantity = optionItemInput.optionQuantity;
                    createOrderOptionDetails = [];
                    totalOptionPrice = 0;
                    const optionDetails = await queryRunner.manager
                        .getCustomRepository(OptionDetailRepository)
                        .getByIds(optionItemInput.optionDetailIds);

                    for (const optionDetail of optionDetails) {
                        if (optionDetail.optionGroup.product.id !== product.id) {
                            throw new BadRequestException(
                                `Not same product, ${optionDetail.optionGroup.product.id} != ${product.id}`
                            );
                        }
                        totalOptionPrice += optionDetail.optionPrice;
                        createOrderOptionDetails.push({
                            optionType: optionDetail.optionGroup.optionType,
                            optionName: optionDetail.optionGroup.optionName,
                            optionValue: optionDetail.optionValue,
                            optionPrice: optionDetail.optionPrice,
                            optionDetail: optionDetail
                        });
                    }
                    await saveOrderItem(product, optionQuantity, productQuantity,
                        totalOptionPrice, order, createOrderOptionDetails);
                }
            } else {
                await saveOrderItem(product, optionQuantity, productQuantity,
                    totalOptionPrice, order, createOrderOptionDetails);
            }
            await queryRunner.commitTransaction();
            return order;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }

        async function saveOrderItem(product: Product, optionQuantity: number,
            productQuantity: number, totalOptionPrice: number,
            order: Order, createOrderOptionDetails: any[]) {
            const quantity = optionQuantity !== 0 ? optionQuantity : productQuantity;
            await queryRunner.manager
                .getCustomRepository(OrderItemRepository)
                .save({
                    brandName: product.brandName,
                    discountRate: product.discountRate,
                    productName: product.productName,
                    productCode: product.productCode,
                    price: (product.price + totalOptionPrice) * quantity,
                    salePrice: (product.salePrice + totalOptionPrice) * quantity,
                    quantity: quantity,
                    product: product,
                    order: order,
                    orderOptionDetails: createOrderOptionDetails
                });
        }
    }

    async applyRefund(email: EmailInput,
        refundInput: RefundInput): Promise<Order> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(email.email);

            let order = await queryRunner.manager
                .getCustomRepository(OrderRepository)
                .getById(refundInput.orderId);

            if (order.orderStatus !== OrderStatus.COMPLETED_DELIVERY) {
                throw new BadRequestException(`OrderStatus is not COMPLETED_DELIVERY. status: ${order.orderStatus}`);
            }

            order.orderStatus = OrderStatus.IN_RETURN;

            let orderItems
                = refundInput.reversalType === ReversalType.APPLY_PARTIAL_REFUND
                    ? await queryRunner.manager
                        .getCustomRepository(OrderItemRepository)
                        .getByIds(refundInput.orderItemIds)
                    : order.orderItems;

            changeOrderItemStatus(orderItems);

            order = await queryRunner.manager
                        .getCustomRepository(OrderRepository)
                        .save({...order, 
                            reasonForRefund: refundInput.reasonForRefund,
                            reversalType: ReversalType[refundInput.reversalType],
                            refundShippingFeeType: RefundShippingFeeType[refundInput.refundShippingFeeType],
                             orderItems}), 

            await queryRunner.commitTransaction();
            return order;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }

        function changeOrderItemStatus(orderItems: OrderItem[]) {
            orderItems.forEach(orderItem => {
                if (orderItem.orderItemStatus !== OrderItemStatus.SUCCESS) {
                    throw new BadRequestException(`OrderItemStatus is not SUCCESS. status: ${orderItem.orderItemStatus}`);
                }
                orderItem.orderItemStatus = OrderItemStatus.APPLY_REFUND;
            });
        }
    }
}
