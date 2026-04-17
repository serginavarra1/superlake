import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { GoogleAuth, Impersonated } from 'google-auth-library';

@Injectable()
export class BigQueryClientFactory implements OnModuleInit {
  private readClient!: Impersonated;
  private writeClient!: Impersonated;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const sourceClient = await new GoogleAuth().getClient();
    const targetScopes = ['https://www.googleapis.com/auth/bigquery'];

    this.readClient = new Impersonated({
      sourceClient,
      targetPrincipal: this.configService.get<string>('GCP_BQ_READ_SA')!,
      targetScopes,
    });

    this.writeClient = new Impersonated({
      sourceClient,
      targetPrincipal: this.configService.get<string>('GCP_BQ_WRITE_SA')!,
      targetScopes,
    });
  }

  getBigQueryReadClient(projectId: string): BigQuery {
    return new BigQuery({ projectId, authClient: this.readClient });
  }

  getBigQueryWriteClient(projectId: string): BigQuery {
    return new BigQuery({ projectId, authClient: this.writeClient });
  }
}
