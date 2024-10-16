import { EntityRepository, Repository } from "typeorm";
import { Order } from "./order.entity";
import { BadRequestException, NotFoundException } from "@nestjs/common";

@EntityRepository(Order)
export class OrderRepository extends Repository<Order> {
    async getById(id: number): Promise<Order> {
        const order = await this.findOne({
            where: {
                id: id
            },
            relations: ['orderItems', 'orderItems.product']
        });
        if(!order) {
            throw new BadRequestException(`Not found order, orderId: ${id}`);
        }
        return order;
    }

    async validateOrder(id: number): Promise<void> {
        const order = await this.findOne({ where: { id: id } });
        if(!order) {
            throw new NotFoundException(`Not found order, orderId: ${id}`);
        }
    }

    async getDetailsById(id: number): Promise<Order> {
        const order = await this.findOne({
            where: {
                id: id
            },
            relations: ['orderItems', 'orderItems.product', 'payments']
        });
        if(!order) {
            throw new BadRequestException(`Not found order, orderId: ${id}`);
        }
        return order;
    }
}