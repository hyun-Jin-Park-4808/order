import { EntityRepository, Repository } from "typeorm";
import { DeliveryMemo } from "./delivery-memo.entity";
import { BadRequestException } from "@nestjs/common";

@EntityRepository(DeliveryMemo)
export class DeliveryMemoRepository extends Repository<DeliveryMemo> {
    async getById(id: number): Promise<DeliveryMemo> {
        const deliveryMemo = await this.findOne(id);
        if(!deliveryMemo) {
            throw new BadRequestException(`Not found delivery memo, id: ${id}`);
        }
        return deliveryMemo;
    }

    async deleteMemo(memberId: number, id: number): Promise<void> {
        const deliveryMemo = await this.findOne({
            where: {
                member: {
                    id: memberId
                },
                id: id
            }
        });

        if(!deliveryMemo) {
            throw new BadRequestException(`Not a delivery memo for the logged in user, memberId: ${memberId}`)
        }
        await this.delete(id);
    }

    async getRecentMemo(memberId: number): Promise<DeliveryMemo> {
        const recentDeliveryMemo = await this.findOne({
            where: {
                member: {
                    id: memberId
                }
            },
            order: {
                updatedAt: 'DESC'
            },
        });

        if(!recentDeliveryMemo) {
            throw new BadRequestException(`Not a recent delivery memo for the logged in user, memberId: ${memberId}`)
        }
        return recentDeliveryMemo;
    }


}