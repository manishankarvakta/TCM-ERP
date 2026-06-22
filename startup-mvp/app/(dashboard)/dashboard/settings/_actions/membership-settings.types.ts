export const MEMBERSHIP_SETTINGS_KEY = "membership";

export interface MembershipSettings {
  pointsSpentRatio: number;
  pointValue: number;
  enableThresholdDiscount: boolean;
  minPurchaseForDiscount: number;
  discountPercentage: number;
}

export const DEFAULT_MEMBERSHIP_SETTINGS: MembershipSettings = {
  pointsSpentRatio: 100, // 100 Taka = 1 point
  pointValue: 1.0,      // 1 point = 1 Taka
  enableThresholdDiscount: false,
  minPurchaseForDiscount: 20000,
  discountPercentage: 5,
};
