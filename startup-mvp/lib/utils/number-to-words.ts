/**
 * Converts a numeric amount to English words formatted for Taka currency.
 * e.g., 23241 => "Twenty Three Thousand Two Hundred Forty One Taka Only"
 */
export function numberToWords(amount: number): string {
  const roundedAmount = Math.round(amount * 100) / 100;
  if (roundedAmount === 0) return "Zero Taka Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

  // Split integer and decimal parts
  const parts = roundedAmount.toFixed(2).split(".");
  const integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  function convertGroup(num: number): string {
    let result = "";
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + " ";
      num %= 10;
    }
    if (num > 0) {
      result += ones[num] + " ";
    }
    return result.trim();
  }

  let words = "";
  let tempNumber = integerPart;

  if (tempNumber === 0) {
    words = "Zero";
  } else {
    let scaleIndex = 0;
    while (tempNumber > 0) {
      const group = tempNumber % 1000;
      if (group > 0) {
        const groupWords = convertGroup(group);
        const scale = scales[scaleIndex];
        words = groupWords + (scale ? " " + scale : "") + (words ? " " + words : "");
      }
      tempNumber = Math.floor(tempNumber / 1000);
      scaleIndex++;
    }
  }

  words = words.trim() + " Taka";

  if (decimalPart > 0) {
    const decimalWords = convertGroup(decimalPart);
    if (decimalWords) {
      words += " And " + decimalWords + " Paisa";
    }
  }

  words += " Only";

  // Clean any extra whitespace
  return words.replace(/\s+/g, " ");
}
