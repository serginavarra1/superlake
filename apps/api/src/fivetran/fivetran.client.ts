import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FivetranGroup {
  id: string;
  name: string;
}

export interface FivetranDestination {
  id: string;
  group_id: string;
  service: string;
  region: string;
  setup_status: string;
}

export interface FivetranConnectorResponse {
  id: string;
  group_id: string;
  service: string;
  schema: string;
  paused: boolean;
  sync_frequency: number;
  status: {
    setup_state: string;
    sync_state: string;
    update_state?: string;
    is_historical_sync?: boolean;
    tasks?: unknown[];
    warnings?: unknown[];
  };
  succeeded_at?: string | null;
  failed_at?: string | null;
  created_at?: string;
  connect_card?: {
    token: string;
    uri: string;
  };
}


export interface FivetranConnectorMetadata {
  id: string;
  name: string;
  type: string;
  description?: string;
  icon_url?: string;
  link_to_docs?: string;
}

@Injectable()
export class FivetranClient {
  private readonly logger = new Logger(FivetranClient.name);
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('FIVETRAN_BASE_URL') ||
      'https://api.fivetran.com';

    const key = this.configService.get<string>('FIVETRAN_API_KEY')!;
    const secret = this.configService.get<string>('FIVETRAN_API_SECRET')!;
    this.authHeader =
      'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!res.ok) {
      this.logger.error(
        `Fivetran ${method} ${path} failed: ${res.status} ${text}`,
      );
      throw new InternalServerErrorException(
        `Fivetran API error (${res.status}): ${text.slice(0, 500)}`,
      );
    }

    const data = (payload as { data?: T }).data;
    return (data ?? (payload as T)) as T;
  }

  async createGroup(name: string): Promise<FivetranGroup> {
    return this.request<FivetranGroup>('POST', '/v1/groups', { name });
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.request<unknown>('DELETE', `/v1/groups/${groupId}`);
  }

  async getGroupServiceAccount(groupId: string): Promise<string> {
    const res = await this.request<{ service_account: string }>(
      'GET',
      `/v1/groups/${groupId}/service-account`,
    );
    const sa = res.service_account;
    return sa.includes('@')
      ? sa
      : `${sa}@fivetran-production.iam.gserviceaccount.com`;
  }

  async createBigQueryDestination(args: {
    groupId: string;
    projectId: string;
    dataSetLocation: string;
    bucket?: string;
  }): Promise<FivetranDestination> {
    return this.request<FivetranDestination>('POST', '/v1/destinations', {
      group_id: args.groupId,
      service: 'big_query',
      region: 'GCP_EUROPE_WEST3',
      time_zone_offset: '0',
      config: {
        project_id: args.projectId,
        data_set_location: args.dataSetLocation,
        ...(args.bucket ? { bucket: args.bucket } : {}),
      },
      run_setup_tests: true,
    });
  }

  async listConnectorMetadata(args: {
    limit: number;
    cursor?: string;
  }): Promise<{ items: FivetranConnectorMetadata[]; nextCursor?: string }> {
    const params = new URLSearchParams({ limit: String(args.limit) });
    if (args.cursor) params.set('cursor', args.cursor);
    const res = await this.request<{
      items: FivetranConnectorMetadata[];
      next_cursor?: string;
    }>('GET', `/v1/metadata/connector-types?${params.toString()}`);
    return { items: res.items ?? [], nextCursor: res.next_cursor };
  }

  async listConnections(args: {
    groupId: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: FivetranConnectorResponse[]; nextCursor?: string }> {
    const params = new URLSearchParams({
      group_id: args.groupId,
      limit: String(args.limit ?? 100),
    });
    if (args.cursor) params.set('cursor', args.cursor);
    const res = await this.request<{
      items: FivetranConnectorResponse[];
      next_cursor?: string;
    }>('GET', `/v1/connections?${params.toString()}`);
    return { items: res.items ?? [], nextCursor: res.next_cursor };
  }

  async createConnector(args: {
    groupId: string;
    service: string;
    schema: string;
    syncFrequency: number;
    redirectUri: string;
  }): Promise<FivetranConnectorResponse> {
    return this.request<FivetranConnectorResponse>('POST', '/v1/connections', {
      service: args.service,
      group_id: args.groupId,
      paused: true,
      run_setup_tests: false,
      sync_frequency: args.syncFrequency,
      config: {
        schema: args.schema,
      },
      connect_card_config: { redirect_uri: args.redirectUri },
    });
  }

  async getConnector(connectorId: string): Promise<FivetranConnectorResponse> {
    return this.request<FivetranConnectorResponse>(
      'GET',
      `/v1/connections/${connectorId}`,
    );
  }

  async modifyConnector(
    connectorId: string,
    body: Record<string, unknown>,
  ): Promise<FivetranConnectorResponse> {
    return this.request<FivetranConnectorResponse>(
      'PATCH',
      `/v1/connections/${connectorId}`,
      body,
    );
  }

  async deleteConnector(connectorId: string): Promise<void> {
    await this.request<unknown>('DELETE', `/v1/connections/${connectorId}`);
  }

  async syncNow(connectorId: string): Promise<void> {
    await this.request<unknown>(
      'POST',
      `/v1/connections/${connectorId}/sync`,
      {},
    );
  }

}
