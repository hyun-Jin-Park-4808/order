import { EntityRepository, Repository } from "typeorm";
import { Delivery } from "./delivery.entity";
import { BadRequestException } from "@nestjs/common";

@EntityRepository(Delivery)
export class DeliveryRepository extends Repository<Delivery> {
    async getById(id: number): Promise<Delivery> {
        const delivery = await this.findOne(id);
        if(!delivery) {
            throw new BadRequestException(`Not found delivery, id: ${id}`);
        }
        return delivery;
    }

    async changeDefaultDelivery(memberId: number): Promise<void> {
        const delivery = await this.findOne({
            where: {
                member: {
                    id: memberId
                },
                isDefault: true
            }
        });

        if(delivery) {
            delivery.isDefault = false;
            await this.save(delivery);
        }
    }

    async getDefaultByMemberId(memberId: number): Promise<Delivery> {
        const delivery = await this.findOne({
            where: {
                member: {
                    id: memberId
                },
                isDefault: true
            }
        });

        if(!delivery) {
            throw new BadRequestException(`Not found default delivery, memberId: ${memberId}`)
        }
        return delivery;
    }

    async deleteDelivery(memberId: number, id: number): Promise<void> {
        const delivery = await this.findOne({
            where: {
                member: {
                    id: memberId
                },
                id: id
            }
        });

        if(!delivery) {
            throw new BadRequestException(`Not a delivery for the logged in user, memberId: ${memberId}`)
        }
        await this.delete(id);
    }
}