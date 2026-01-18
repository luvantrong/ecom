const RoleName = {
  Admin: 'ADMIN',
  Client: 'CLIENT',
  Seller: 'SELLER',
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];
