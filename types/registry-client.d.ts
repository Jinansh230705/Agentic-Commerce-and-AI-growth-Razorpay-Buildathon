declare module '@prisma/registry-client' {
  export class PrismaClient {
    registeredMerchant: any;
    merchantCapability: any;
    $disconnect(): Promise<void>;
  }
}
