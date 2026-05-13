/**
 * Calculate the current depreciated value of a tool.
 *
 * @param {object} tool - The tool entity (needs purchase_price, purchase_date, depreciation_level)
 * @param {array} settings - Array of DepreciationSetting records
 * @returns {{ currentValue: number, depreciationPercent: number }} current value and how much has been depreciated in %
 */
export function calculateDepreciatedValue(tool, settings) {
  const purchasePrice = tool.purchase_price || 0;
  const purchaseDate = tool.purchase_date;
  const level = tool.depreciation_level;

  // If no depreciation info, return purchase price
  if (!purchasePrice || !purchaseDate || !level || !settings?.length) {
    return { currentValue: purchasePrice, depreciationPercent: 0 };
  }

  const setting = settings.find(s => s.level_name === level);
  if (!setting) {
    return { currentValue: purchasePrice, depreciationPercent: 0 };
  }

  const annualRate = (setting.annual_percentage || 0) / 100;
  const minPercent = (setting.minimum_value_percentage || 0) / 100;
  const minimumValue = purchasePrice * minPercent;

  // Calculate months since purchase
  const start = new Date(purchaseDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const months = Math.max(0, monthsDiff);

  // Monthly depreciation amount (linear)
  const monthlyDepreciation = (purchasePrice * annualRate) / 12;
  const totalDepreciation = monthlyDepreciation * months;

  const currentValue = Math.max(minimumValue, purchasePrice - totalDepreciation);
  const depreciationPercent = purchasePrice > 0
    ? Math.round(((purchasePrice - currentValue) / purchasePrice) * 100)
    : 0;

  return { currentValue: Math.round(currentValue), depreciationPercent };
}

/**
 * Default depreciation settings to seed if none exist.
 */
export const DEFAULT_SETTINGS = [
  { level_name: 'Låg', annual_percentage: 20, minimum_value_percentage: 20 },
  { level_name: 'Medel', annual_percentage: 30, minimum_value_percentage: 10 },
  { level_name: 'Hög', annual_percentage: 40, minimum_value_percentage: 10 },
];