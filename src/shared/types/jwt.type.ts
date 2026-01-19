export interface AccessTokenPayloadCreate {
  userId: number;
  deviceId: number;
  roleName: string;
  roleId: number;
}

export interface AccessTokenPayload extends AccessTokenPayloadCreate {
  iat: number;
  exp: number;
}

export interface RefreshTokenPayloadCreate {
  userId: number;
}

export interface RefreshTokenPayload extends RefreshTokenPayloadCreate {
  iat: number;
  exp: number;
}
