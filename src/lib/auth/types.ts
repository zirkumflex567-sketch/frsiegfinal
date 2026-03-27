export type AdminRole = "admin" | "editor";

export type AdminSessionPayload = {
  userId: string;
  email: string;
  role: AdminRole;
  exp?: number;
  iat?: number;
};

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
};
