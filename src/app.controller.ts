import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Post()
  async QAHttpController(@Body() dto: { message: string }): Promise<string> {
    if(!dto?.message?.length) return "Message must not be empty"
    return await this.appService.QAHttpService(dto.message);
  }
}
