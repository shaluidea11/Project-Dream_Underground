import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CampaignAgentService } from './agents/campaign-agent.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(CampaignAgentService);
  try {
    console.log("Calling CampaignAgentService...");
    const res = await service.generateCampaign("reengage high value customers who are not buying products for 90 days");
    console.log("SUCCESS:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
  await app.close();
}

main().catch(console.error);
