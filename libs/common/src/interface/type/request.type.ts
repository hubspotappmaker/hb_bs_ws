import { User } from "@app/common/schemas/user.schema";

export { };

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface PropertyConfig {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  groupName: string;
  objectType: 'contacts' | 'deals' | 'products';
}

export interface GroupConfig {
  objectType: string;
  name: string;
  label: string;
  displayOrder: number;
}
