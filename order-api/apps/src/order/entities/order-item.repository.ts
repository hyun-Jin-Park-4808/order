import { EntityRepository, In, Repository } from "typeorm";
import { OrderItem } from "./order-item.entity";
import { BadRequestException } from "@nestjs/common";

@EntityRepository(OrderItem)
export class OrderItemRepository extends Repository<OrderItem> {
    async getByIds(ids: number[]): Promise<OrderItem[]> {
        if(!ids || ids.length === 0) {
            throw new BadRequestException('ID list cannot be empty.');
        }

        const orderItems = await this.find({
            where: {
                id: In(ids)
            }
        });

        if(!orderItems || orderItems.length === 0) {
            throw new BadRequestException(`Not found order Items, idList: ${ids}`);
        }
        return orderItems;
    }
}