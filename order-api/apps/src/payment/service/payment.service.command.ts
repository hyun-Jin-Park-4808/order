import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrderItemRepository } from '../../order/entities/order-item.repository';
import * as AWS from 'aws-sdk';
import { plainToClass } from 'class-transformer';
import { Connection, QueryRunner } from 'typeorm';
import { PortOneAPI } from '../../apis/portone.api';
import { DeliveryMemoRepository } from '../../delivery-memo/enitities/delivery-memo.repository';
import { DeliveryRepository } from '../../delivery/entities/delivery.repository';
import { EmailInput } from '../../member/dto/email.input.dto';
import { MemberRepository } from '../../member/entities/member.repository';
import { ItemsInput, OrderItemInput } from '../../order/dto/order.item.input.dto';
import { OrderItem, OrderItemStatus } from '../../order/entities/order-item.entity';
import { OrderStatus, RefundShippingFeeType, ReversalType } from '../../order/entities/order.entity';
import { OrderRepository } from '../../order/entities/order.repository';
import { CancelPaymentInput, CancelRequester } from '../dto/cancel.payment.input.dto';
import { PaymentInput } from '../dto/payment.input.dto';
import { PaymentCanCelStatus } from '../dto/portone-payment.cancellation.dto';
import { PaymentStatus, PortOnePaymentOutput } from '../dto/portone-payment.output.dto';
import { Payment, PaymentReversalType } from '../entities/payment.entity';
import { PaymentRepository } from '../entities/payment.repository';

@Injectable()
export class PaymentCommandService {
    constructor(
        private readonly connection: Connection,
        private readonly portOneAPI: PortOneAPI,
    ) { }

    async payment(email: EmailInput, paymentInput: PaymentInput): Promise<Payment> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(email.email);

            // 포트원 결제내역 단건조회 API 호출
            const paymentResponse =
                await this.portOneAPI.getPayment(paymentInput.paymentId);

            if (!paymentResponse.ok)
                throw new BadRequestException(
                    `paymentResponse: ${JSON.stringify(paymentResponse.error)}`
                );

            const payment: PortOnePaymentOutput
                = paymentResponse.data;

            // 배송지, 배송 메모 정보 추가 
            let order = await queryRunner.manager
                .getCustomRepository(OrderRepository)
                .getById(paymentInput.orderId);

            const delivery = await queryRunner.manager
                .getCustomRepository(DeliveryRepository)
                .getById(paymentInput.deliveryId);

            const deliveryMemo = await queryRunner.manager
                .getCustomRepository(DeliveryMemoRepository)
                .getById(paymentInput.deliveryMemoId);

            let paymentStatus: PaymentStatus;
            if (order.totalAmount + order.shippingFee
                === payment.amount.total + paymentInput.couponAmount + paymentInput.pointAmount) {
                paymentStatus
                    = PaymentStatus[payment.status];
            } else {
                // 결제 금액이 불일치하여 위/변조 시도가 의심됩니다.
                paymentStatus = PaymentStatus.FORGERY;
            }

            if (paymentStatus === PaymentStatus.PAID) {
                order.orderStatus = OrderStatus.COMPLETE_PAYMENT;
                order.orderItems.forEach(
                    orderItem => orderItem.orderItemStatus = OrderItemStatus.SUCCESS
                );
            }
            const result = await queryRunner.manager
                .getCustomRepository(PaymentRepository)
                .save({
                    paymentStatus,
                    ...paymentInput,
                    order,
                    paymentAmount: payment.amount.total
                });

            order = await queryRunner.manager
                .getCustomRepository(OrderRepository)
                .save({
                    ...order,
                    customerName: delivery.customerName,
                    phoneNumber: delivery.phoneNumber,
                    address: delivery.address,
                    deliveryMemo: deliveryMemo.memo,
                    paymentId: paymentInput.paymentId,
                    payMethod: paymentInput.payMethod
                });

            // 결제가 성공적으로 이뤄지거나 이뤄질 예정이면 sqs 생성하고 보내서 재고 감소시키기 
            if ([PaymentStatus.PAID, PaymentStatus.VIRTUAL_ACCOUNT_ISSUED,
            PaymentStatus.READY, PaymentStatus.PAY_PENDING]
                .includes(result.paymentStatus)) {
                const orderItems: ItemsInput = {
                    itemsInput: order.orderItems
                        .map(item => new OrderItemInput(item))
                };

                AWS.config.update({
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    region: process.env.AWS_REGION
                })
                const sqs = new AWS.SQS();

                sqs.sendMessage({
                    QueueUrl: process.env.QUEUE_URL,
                    MessageBody: JSON.stringify(orderItems),

                },
                    (err, data) => {
                        if (err) {
                            Logger.log(err.message);
                        } else {
                            Logger.log(data);
                        }
                    }
                )
            }
            await queryRunner.commitTransaction();
            return result;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async cancelPayment(email: EmailInput, rawInput: any): Promise<Payment> {
        const queryRunner: QueryRunner = this.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const cancelPaymentInput = plainToClass(CancelPaymentInput, rawInput)
            await queryRunner.manager
                .getCustomRepository(MemberRepository)
                .validateMember(email.email);

            let order = await queryRunner.manager
                .getCustomRepository(OrderRepository)
                .getById(cancelPaymentInput.orderId);

            if (![OrderStatus.IN_RETURN, OrderStatus.COMPLETE_PAYMENT,
            OrderStatus.BEFORE_DELIVERY, OrderStatus.COMPLETED_DELIVERY]
                .includes(order.orderStatus)) {
                throw new BadRequestException(`This order can't be canceled or refunded. status: ${order.orderStatus}`);
            }

            if (cancelPaymentInput.isPartial && !cancelPaymentInput.orderItemIds) {
                throw new BadRequestException('Partial reversal need to orderItemIds.');
            }

            let refundShippingFee: number;
            if (cancelPaymentInput.portOnePaymentCancelInput.requester === CancelRequester.ADMIN
                && !cancelPaymentInput.portOnePaymentCancelInput.reason) {
                // 환불인 경우
                if (![ReversalType.APPLY_REFUND, ReversalType.APPLY_PARTIAL_REFUND]
                    .includes(order.reversalType)) {
                    throw new BadRequestException('There is no refund apply.');
                }
                cancelPaymentInput.portOnePaymentCancelInput.reason = order.reasonForReversal;
                refundShippingFee =
                    (order.refundShippingFeeType === RefundShippingFeeType.BUYER_RESPONSIBILITY)
                        ? 5000 : 0;
            }

            // 환불 or 결제 취소 타입 설정
            let prefix = cancelPaymentInput.isPartial ? 'PARTIAL' : 'FULL';
            let action = cancelPaymentInput.portOnePaymentCancelInput.requester
                === CancelRequester.ADMIN ? 'REFUND' : 'CANCEL';

            order.reversalType = ReversalType[`COMPLETE_${prefix}_${action}`];
            order.orderStatus = OrderStatus[`${prefix}_${action}`];
            let paymentReversalType = PaymentReversalType[`${prefix}_${action}`];
            let orderItemStatus = OrderItemStatus[`COMPLETE_${action}`];

            // orderItemStatus 업데이트
            let partialOrderItems: OrderItem[];
            if (cancelPaymentInput.orderItemIds && cancelPaymentInput.isPartial) {
                partialOrderItems = await queryRunner.manager
                    .getCustomRepository(OrderItemRepository)
                    .getByIds(cancelPaymentInput.orderItemIds);
            }
            const itemsToUpdate = partialOrderItems || order.orderItems;
            itemsToUpdate.forEach(item => {
                if (![OrderItemStatus.APPLY_REFUND, OrderItemStatus.SUCCESS]
                    .includes(item.orderItemStatus)) {
                    throw new BadRequestException(`Status is already refund or cancel or confirmed. status: ${item.orderItemStatus}`)
                }
                item.orderItemStatus = orderItemStatus;
            });

            if (partialOrderItems) {
                order.orderItems = { ...order.orderItems, ...partialOrderItems };
            }

            // 결제 취소 요청
            const paymentResponse =
                await this.portOneAPI.cancelPayment(cancelPaymentInput.portOnePaymentCancelInput, order.paymentId);

            if (!paymentResponse.ok) {
                throw new BadRequestException(`paymentResponse: ${JSON.stringify(paymentResponse.error)}`);
            }

            const { cancellation } = paymentResponse.data;

            if (cancellation.status !== PaymentCanCelStatus.SUCCEEDED) {
                throw new BadRequestException('cancellation is not succeeded.');
            }

            order = await queryRunner.manager
                .getCustomRepository(OrderRepository).save({
                    ...order,
                    reasonForReversal: cancellation.reason,
                });

            const result = await queryRunner.manager
                .getCustomRepository(PaymentRepository).save({
                    payMethod: order.payMethod,
                    paymentId: order.paymentId,
                    paymentStatus: cancelPaymentInput.isPartial ?
                        PaymentStatus.PARTIAL_CANCELED : PaymentStatus.CANCELED,
                    paymentAmount: cancellation.totalAmount,
                    paymentReversalType: paymentReversalType,
                    cancelAmount: cancellation.totalAmount,
                    refundShippingFee: refundShippingFee,
                    reasonForReversal: cancellation.reason,
                    order,
                });

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
