/**
 * One row from `/admin/content/subscription-benefits` — both locales
 * surfaced so the admin can edit them side by side. Mobile clients
 * fetch a locale-resolved slim version through `/content/subscription-benefits?lang=…`.
 */
export interface SubscriptionBenefit {
  id: number;
  position: number;
  title_ru: string;
  title_kz: string;
  description_ru: string;
  description_kz: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SubscriptionBenefitCreatePayload = Omit<
  SubscriptionBenefit,
  "id" | "created_at" | "updated_at"
>;

export type SubscriptionBenefitUpdatePayload = Partial<SubscriptionBenefitCreatePayload>;
