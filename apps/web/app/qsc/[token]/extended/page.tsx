type ParsedInsights = {
  howToCommunicate?: string;
  decisionStyle?: string;
  businessChallenges?: string;
  trustSignals?: string;
  offerFit?: string;
  saleBlockers?: string;
};

function parseFullInternalInsights(
  text: string | null | undefined
): ParsedInsights {
  if (!text) return {};

  const lower = text.toLowerCase();

  // We use phrases that actually appear in the extended report,
  // and also keep some of the older labels as fallbacks.
  const headings: { label: string; key: keyof ParsedInsights }[] = [
    // 1. How to communicate with this profile
    { label: "how to communicate with this profile", key: "howToCommunicate" },
    { label: "how to communicate", key: "howToCommunicate" },

    // 2. How they make decisions
    { label: "how they make decisions", key: "decisionStyle" },
    { label: "how they decide", key: "decisionStyle" },

    // 3. Their core business challenges
    { label: "their core business challenges", key: "businessChallenges" },
    { label: "core business challenges", key: "businessChallenges" },

    // 4. What they need to feel safe buying (we'll treat this as trust/safety)
    { label: "what they need to feel safe buying", key: "trustSignals" },

    // 5. What offer type fits them best
    { label: "what offer type fits them best", key: "offerFit" },
    { label: "best offer fit", key: "offerFit" },

    // 6. What will block the sale
    { label: "what will block the sale", key: "saleBlockers" },
    { label: "biggest sale blockers", key: "saleBlockers" },
  ];

  const result: ParsedInsights = {};

  // We need to preserve order of sections, so we track where each heading starts.
  const found: { label: string; key: keyof ParsedInsights; index: number }[] =
    [];

  for (const { label, key } of headings) {
    const idx = lower.indexOf(label.toLowerCase());
    if (idx !== -1) {
      found.push({ label, key, index: idx });
    }
  }

  // Sort by position in text
  found.sort((a, b) => a.index - b.index);

  for (let i = 0; i < found.length; i++) {
    const { label, key, index } = found[i];

    const contentStart = index + label.length;

    // find the next heading (if any) to know where this section stops
    let endIndex = text.length;
    if (i + 1 < found.length) {
      endIndex = found[i + 1].index;
    }

    const raw = text.slice(contentStart, endIndex).trim();
    if (raw) {
      if (result[key]) {
        // If multiple labels map to same key, append with spacing
        result[key] = (result[key] as string) + "\n\n" + raw;
      } else {
        result[key] = raw;
      }
    }
  }

  return result;
}

