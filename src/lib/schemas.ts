import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(255);

const urlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => /^https?:\/\//i.test(value), "链接必须以 http:// 或 https:// 开头");

export const setupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "密码至少 8 位").max(72),
  seed_demo: z.boolean().optional().default(true),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "分类名不能为空").max(80),
  icon: z.string().trim().max(16).nullable().optional(),
  description: z.string().trim().max(255).nullable().optional(),
  sort_order: z.number().int().optional().default(0),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "分类名不能为空").max(80).optional(),
  icon: z.string().trim().max(16).nullable().optional(),
  description: z.string().trim().max(255).nullable().optional(),
  sort_order: z.number().int().optional(),
});

export const siteInputSchema = z.object({
  category_id: z.number().int().positive(),
  title: z.string().trim().min(1, "站点名不能为空").max(120),
  url: urlSchema,
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(512).nullable().optional(),
  sort_order: z.number().int().optional().default(0),
});

export const siteUpdateSchema = z.object({
  category_id: z.number().int().positive().optional(),
  title: z.string().trim().min(1, "站点名不能为空").max(120).optional(),
  url: urlSchema.optional(),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(512).nullable().optional(),
  sort_order: z.number().int().optional(),
});

export const siteSettingsSchema = z.object({
  site_name: z.string().trim().max(80).nullable().optional(),
  icp: z.string().trim().max(120).nullable().optional(),
  police: z.string().trim().max(120).nullable().optional(),
});

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "提交的内容不合法";
}
