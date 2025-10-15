export function computeCompanyProgress(data: {
  website?: string;
  linkedin?: string;
  industry?: string;
  sector?: string;
}) {
  let filled = 0;
  if (data.website?.trim()) filled++;
  if (data.linkedin?.trim()) filled++;
  if (data.industry?.trim()) filled++;
  if (data.sector?.trim()) filled++;
  return Math.round((filled / 4) * 100);
}
