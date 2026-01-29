// apps/web/lib/report/buildCoachSummary.ts

export type CoachSummaryInput = {
  participant: {
    firstName?: string;
    role?: string;
    company?: string;
  };
  organisation: {
    name: string;
  };
  frequencies: {
    labels: { code: 'A' | 'B' | 'C' | 'D'; name: string }[];
    percentages: Record<'A' | 'B' | 'C' | 'D', number>;
    topCode: 'A' | 'B' | 'C' | 'D';
  };
  profiles: {
    labels: { code: string; name: string }[];
    percentages: Record<string, number>;
    primary?: { code: string; name: string; pct?: number };
    secondary?: { code: string; name: string; pct?: number };
    tertiary?: { code: string; name: string; pct?: number };
  };
};

function percentToText(value: number | undefined): string {
  if (!value || Number.isNaN(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

/**
 * Build a short, coach-ready narrative summary from the test data.
 * Returns a single string with paragraphs separated by blank lines.
 */
export function buildCoachSummary(input: CoachSummaryInput): string {
  const { participant, organisation, frequencies, profiles } = input;

  const name = participant.firstName?.trim() || 'this participant';
  const role = participant.role?.trim();
  const company = participant.company?.trim();

  const contextLineParts: string[] = [];
  if (role) contextLineParts.push(role);
  if (company) contextLineParts.push(company);
  const contextLine =
    contextLineParts.length > 0 ? `, currently in ${contextLineParts.join(' at ')}` : '';

  const topFreqLabel =
    frequencies.labels.find((f) => f.code === frequencies.topCode)?.name ||
    frequencies.topCode;

  const primaryPct = profiles.primary?.pct;
  const secondaryPct = profiles.secondary?.pct;
  const tertiaryPct = profiles.tertiary?.pct;

  const primaryName = profiles.primary?.name;
  const secondaryName = profiles.secondary?.name;
  const tertiaryName = profiles.tertiary?.name;

  const lines: string[] = [];

  // Intro
  lines.push(
    `${name}'s ${organisation.name} profile points to a clear pattern of contribution${contextLine}.`
  );

  // Frequencies
  lines.push(
    `Their strongest overall frequency is ${topFreqLabel}, which suggests this is the space where they are most energised and where decisions and momentum are most likely to originate.`
  );

  // Profile mix
  if (primaryName) {
    const parts: string[] = [];
    parts.push(
      `The primary profile is ${primaryName}${
        primaryPct != null ? ` (${percentToText(primaryPct)})` : ''
      }`
    );
    if (secondaryName) {
      parts.push(
        `supported by ${secondaryName}${
          secondaryPct != null ? ` (${percentToText(secondaryPct)})` : ''
        }`
      );
    }
    if (tertiaryName) {
      parts.push(
        `and a tertiary pattern of ${tertiaryName}${
          tertiaryPct != null ? ` (${percentToText(tertiaryPct)})` : ''
        }`
      );
    }
    lines.push(parts.join(', ') + '.');
  }

  // Coaching angle – strengths
  lines.push(
    `From a coaching perspective, it will be important to help ${name} name where this natural energy is already adding value, and ensure their role design and day-to-day work give regular opportunities to use it deliberately.`
  );

  // Coaching angle – watch-outs
  lines.push(
    `Equally, there is value in noticing where their dominant patterns might be over-used – for example, defaulting to their preferred way of working under pressure, or finding it harder to stay engaged when the work leans heavily into lower-percentage frequencies.`
  );

  // Coaching angle – conversations
  lines.push(
    `Useful coaching conversations could explore: situations where ${name} feels most “in flow”; specific tasks or relationships that drain energy; and small experiments to broaden their range without asking them to become a different person.`
  );

  return lines.join('\n\n');
}

