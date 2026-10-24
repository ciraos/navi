export type User = {
  id: number;
  email: string;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
};

export type SiteMeta = {
  name: string;
  description: string;
  icp: string | null;
  police: string | null;
};

export type SiteSettings = {
  site_name: string | null;
  icp: string | null;
  police: string | null;
};

export type AuthStatus = {
  initialized: boolean;
  authenticated: boolean;
  user: User | null;
  site: SiteMeta;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
};

export type Site = {
  id: number;
  category_id: number;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  clicks: number;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  sites: Site[];
};

export type NavPayload = { site: SiteMeta; categories: Category[] };

export type CategoryInput = {
  name: string;
  icon?: string | null;
  description?: string | null;
  sort_order?: number;
};

export type SiteInput = {
  category_id: number;
  title: string;
  url: string;
  description?: string | null;
  icon?: string | null;
  sort_order?: number;
};
