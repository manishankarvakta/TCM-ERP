// LocationRates interface for PWD items
// This interface supports both formats:
// 1. With rateDhakaMym, rateChatSyl, etc. (used in forms)
// 2. With dhaka_mymensingh, chattogram_sylhet, etc. (used in tables)
export interface LocationRates {
  // Format 1: camelCase (used in forms)
  rateDhakaMym?: number | string;
  rateChatSyl?: number | string;
  rateKhulBariGop?: number | string;
  rateRajRange?: number | string;
  
  // Format 2: snake_case (used in tables)
  dhaka_mymensingh?: number | string;
  chattogram_sylhet?: number | string;
  khulna_barisal_gopalgonj?: number | string;
  rajshahi_rangpur?: number | string;
}

// PWD Item interface
export interface PWDItem {
  id?: string;
  code: string;
  description: string;
  unit: string;
  rateDhakaMym: number | string;
  rateChatSyl: number | string;
  rateKhulBariGop: number | string;
  rateRajRange: number | string;
  category?: string;
}

