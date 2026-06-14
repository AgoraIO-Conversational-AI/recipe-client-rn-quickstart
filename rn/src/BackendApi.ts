export interface AgentConfig {
  appId: string;
  token: string;
  uid: string;
  channelName: string;
  agentUid: string;
}

export class BackendApi {
  constructor(private baseUrl: string) {}

  async getConfig(): Promise<AgentConfig> {
    const r = await fetch(`${this.baseUrl}/get_config?uid=0`);
    const j: any = await r.json();
    const d = j.data;
    return {
      appId: d.app_id,
      token: d.token,
      uid: d.uid,
      channelName: d.channel_name,
      agentUid: d.agent_uid,
    };
  }

  async startAgent(channelName: string, rtcUid: number, userUid: number): Promise<string> {
    const r = await fetch(`${this.baseUrl}/startAgent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelName, rtcUid, userUid }),
    });
    return ((await r.json()) as any).data.agent_id;
  }

  async stopAgent(agentId: string): Promise<void> {
    await fetch(`${this.baseUrl}/stopAgent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
  }
}
