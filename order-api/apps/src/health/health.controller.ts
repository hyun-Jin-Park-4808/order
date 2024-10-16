import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('/health')
  async healthCheck() {
    return 'ok';
  }
}