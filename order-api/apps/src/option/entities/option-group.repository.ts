import { EntityRepository, Repository } from "typeorm";
import { OptionGroup } from "./option-group.entity";

@EntityRepository(OptionGroup)
export class OptionGroupRepository extends Repository<OptionGroup> {

}