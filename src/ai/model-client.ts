/** The one capability the app needs from a model: turn a prompt into JSON text. */
export interface JsonModelClient {
  generateJson(request: { system: string; user: string; signal: AbortSignal }): Promise<string>;
}
