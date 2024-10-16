import { EntityRepository, Repository } from "typeorm";
import { OptionItem } from "./option-item.entity";
import { NotFoundException } from "@nestjs/common";

@EntityRepository(OptionItem)
export class OptionItemRepository extends Repository<OptionItem> {
    async getById(id: number): Promise<OptionItem> {
        const optionItem = await this.findOne({
            where: {
                id: id,
                isDeleted: false,
            },
            relations: ['cartItem']
        });
        if(!optionItem) {
            throw new NotFoundException(`Not found option item, id: ${id}`);
        }
        return optionItem;
    }

}