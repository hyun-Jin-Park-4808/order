import { EntityRepository, Repository } from "typeorm";
import { Payment } from "./payment.entity";
import { NotFoundException } from "@nestjs/common";

@EntityRepository(Payment)
export class PaymentRepository extends Repository<Payment> {
    async getById(id: number): Promise<Payment> {
        const payement = await this.findOne({
            where: {id: id},
            relations: ['order']
        });
        if(!payement) {
            throw new NotFoundException(`Not found payment, id: ${id}`);
        }
        return payement;
    }
}