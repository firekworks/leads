export type InternalRole = "admin" | "sales" | "viewer";

export type InternalProfile = {
  userId: string;
  email: string;
  fullName: string;
  role: InternalRole;
};
