declare module '@oas-tools/core' {
  export function initialize(app: any, config?: any): Promise<void>;
  export const middleware: any;
}
