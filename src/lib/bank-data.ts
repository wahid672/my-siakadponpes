/**
 * Indonesian Bank Dataset & Logos
 * Assets are served locally from /banks/ (bundled from GitHub hafidznoor/idn-finlogos)
 * with automatic fallback to GitHub raw repository for maximum reliability.
 */

export interface BankItem {
  name: string;
  slug: string;
  code?: string;
  category: "bank-logo" | "e-wallet";
  logoUrl: string;
  aliases?: string[];
}

export const LOCAL_BANKS_DIR = "/banks";
export const GITHUB_RAW_BASE_ICON_URL = "https://raw.githubusercontent.com/hafidznoor/idn-finlogos/main/icons";

/**
 * Mapping of Tripay payment channel codes to local bank asset slugs
 */
export const TRIPAY_CHANNEL_SLUG_MAP: Record<string, string> = {
  briva: "bri",
  bniva: "bni",
  mandiriva: "mandiri",
  bcava: "bca",
  bsiva: "bsi",
  permatava: "permata",
  muamalatva: "muamalat",
  cimbva: "cimb-niaga",
  danamonva: "danamon",
  mybva: "maybank",
  qris: "qris",
  qris2: "qris",
  qrisc: "qris",
  dana: "dana",
  ovo: "ovo",
  gopay: "gopay",
  linkaja: "linkaja",
  shopeepay: "shopeepay",
};

/**
 * Normalizes any legacy or external icon URL or Tripay channel to local /banks/ SVG asset.
 */
export function normalizeBankLogoUrl(url: string | undefined, slug?: string): string {
  const cleanSlug = slug ? slug.toLowerCase().replace(/^manual_/, "") : "";
  const mappedSlug = cleanSlug ? (TRIPAY_CHANNEL_SLUG_MAP[cleanSlug] || cleanSlug) : "";

  if (!url) {
    return mappedSlug ? `${LOCAL_BANKS_DIR}/${mappedSlug}.svg` : "";
  }
  // Convert any jsdelivr npm URL to local asset
  if (url.includes("cdn.jsdelivr.net/npm/idn-finlogos") || url.includes("unpkg.com/idn-finlogos")) {
    const extractedSlug = url.split("/").pop()?.replace(/\.svg$/, "") || mappedSlug;
    if (extractedSlug) {
      const finalSlug = TRIPAY_CHANNEL_SLUG_MAP[extractedSlug.toLowerCase()] || extractedSlug;
      return `${LOCAL_BANKS_DIR}/${finalSlug}.svg`;
    }
  }
  return url;
}

/**
 * Resolves bank icon URL (prefers local /banks/ first, then clean URL).
 */
export function getBankIconUrl(slug: string): string {
  if (!slug) return "";
  if (slug.startsWith("http://") || slug.startsWith("https://")) {
    return normalizeBankLogoUrl(slug);
  }
  const clean = slug.toLowerCase().replace(/^manual_/, "");
  const mapped = TRIPAY_CHANNEL_SLUG_MAP[clean] || clean;
  return `${LOCAL_BANKS_DIR}/${mapped}.svg`;
}

/**
 * Curated list of popular Indonesian commercial, Islamic, regional (BPD), and digital banks.
 * Uses local SVG assets in /banks/ for 100% reliability and instant offline load.
 */
export const POPULAR_INDONESIAN_BANKS: BankItem[] = [
  {
    name: "Bank Syariah Indonesia (BSI)",
    slug: "bsi",
    code: "451",
    category: "bank-logo",
    logoUrl: "/banks/bsi.svg",
    aliases: ["bsi", "syariah mandiri", "bank syariah indonesia"],
  },
  {
    name: "Bank Central Asia (BCA)",
    slug: "bca",
    code: "014",
    category: "bank-logo",
    logoUrl: "/banks/bca.svg",
    aliases: ["bca", "bank central asia", "bca digital", "blu"],
  },
  {
    name: "Bank Rakyat Indonesia (BRI)",
    slug: "bri",
    code: "002",
    category: "bank-logo",
    logoUrl: "/banks/bri.svg",
    aliases: ["bri", "bank rakyat indonesia", "brimo"],
  },
  {
    name: "Bank Mandiri",
    slug: "mandiri",
    code: "008",
    category: "bank-logo",
    logoUrl: "/banks/mandiri.svg",
    aliases: ["mandiri", "bank mandiri", "livin"],
  },
  {
    name: "Bank Negara Indonesia (BNI)",
    slug: "bni",
    code: "009",
    category: "bank-logo",
    logoUrl: "/banks/bni.svg",
    aliases: ["bni", "bank negara indonesia", "bni 46"],
  },
  {
    name: "Bank Tabungan Negara (BTN)",
    slug: "btn",
    code: "200",
    category: "bank-logo",
    logoUrl: "/banks/btn.svg",
    aliases: ["btn", "bank tabungan negara"],
  },
  {
    name: "BTN Syariah",
    slug: "btn-syariah",
    code: "200",
    category: "bank-logo",
    logoUrl: "/banks/btn-syariah.svg",
    aliases: ["btn syariah"],
  },
  {
    name: "Bank CIMB Niaga",
    slug: "cimb-niaga",
    code: "022",
    category: "bank-logo",
    logoUrl: "/banks/cimb-niaga.svg",
    aliases: ["cimb", "cimb niaga", "octo"],
  },
  {
    name: "Bank Muamalat",
    slug: "muamalat",
    code: "147",
    category: "bank-logo",
    logoUrl: "/banks/muamalat.svg",
    aliases: ["muamalat", "bank muamalat indonesia"],
  },
  {
    name: "Bank Danamon",
    slug: "danamon",
    code: "011",
    category: "bank-logo",
    logoUrl: "/banks/danamon.svg",
    aliases: ["danamon", "bank danamon"],
  },
  {
    name: "Bank Permata",
    slug: "permata",
    code: "013",
    category: "bank-logo",
    logoUrl: "/banks/permata.svg",
    aliases: ["permata", "permata bank", "permata me"],
  },
  {
    name: "Bank Mega",
    slug: "mega",
    code: "426",
    category: "bank-logo",
    logoUrl: "/banks/mega.svg",
    aliases: ["mega", "bank mega"],
  },
  {
    name: "Bank Mega Syariah",
    slug: "mega-syariah",
    code: "506",
    category: "bank-logo",
    logoUrl: "/banks/mega-syariah.svg",
    aliases: ["mega syariah", "bank mega syariah"],
  },
  {
    name: "Bank BJB",
    slug: "bank-bjb",
    code: "110",
    category: "bank-logo",
    logoUrl: "/banks/bank-bjb.svg",
    aliases: ["bjb", "bank jabar", "bank bjb"],
  },
  {
    name: "Bank BJB Syariah",
    slug: "bank-bjb-syariah",
    code: "425",
    category: "bank-logo",
    logoUrl: "/banks/bank-bjb-syariah.svg",
    aliases: ["bjb syariah", "bank bjb syariah"],
  },
  {
    name: "Bank BPD Jateng",
    slug: "bank-bpd-jateng",
    code: "113",
    category: "bank-logo",
    logoUrl: "/banks/bank-bpd-jateng.svg",
    aliases: ["jateng", "bank jateng"],
  },
  {
    name: "Bank BPD Jatim",
    slug: "bank-bpd-jatim",
    code: "114",
    category: "bank-logo",
    logoUrl: "/banks/bank-bpd-jatim.svg",
    aliases: ["jatim", "bank jatim"],
  },
  {
    name: "Bank BPD DIY",
    slug: "bank-bpd-diy",
    code: "112",
    category: "bank-logo",
    logoUrl: "/banks/bank-bpd-diy.svg",
    aliases: ["diy", "bank diy", "jogja"],
  },
  {
    name: "Bank BPD Aceh",
    slug: "bank-bpd-aceh",
    code: "116",
    category: "bank-logo",
    logoUrl: "/banks/bank-bpd-aceh.svg",
    aliases: ["aceh", "bank aceh", "aceh syariah"],
  },
  {
    name: "Bank BPD Bali",
    slug: "bank-bpd-bali",
    code: "129",
    category: "bank-logo",
    logoUrl: "/banks/bank-bpd-bali.svg",
    aliases: ["bali", "bank bali"],
  },
  {
    name: "Bank Nagari (BPD Sumbar)",
    slug: "bank-nagari",
    code: "118",
    category: "bank-logo",
    logoUrl: "/banks/bank-nagari.svg",
    aliases: ["nagari", "bank nagari", "sumbar"],
  },
  {
    name: "Bank Jago",
    slug: "jago",
    code: "542",
    category: "bank-logo",
    logoUrl: "/banks/jago.svg",
    aliases: ["jago", "bank jago", "artos"],
  },
  {
    name: "SeaBank",
    slug: "seabank",
    code: "535",
    category: "bank-logo",
    logoUrl: "/banks/seabank.svg",
    aliases: ["seabank", "sea bank", "shopee"],
  },
  {
    name: "Bank Aladin Syariah",
    slug: "aladin",
    code: "947",
    category: "bank-logo",
    logoUrl: "/banks/aladin.svg",
    aliases: ["aladin", "bank aladin"],
  },
  {
    name: "OCBC NISP",
    slug: "ocbc-nisp",
    code: "028",
    category: "bank-logo",
    logoUrl: "/banks/ocbc-nisp.svg",
    aliases: ["ocbc", "ocbc nisp"],
  },
  {
    name: "DANA",
    slug: "dana",
    category: "e-wallet",
    logoUrl: "/banks/dana.svg",
    aliases: ["dana"],
  },
  {
    name: "GoPay",
    slug: "gopay",
    category: "e-wallet",
    logoUrl: "/banks/gopay.svg",
    aliases: ["gopay", "gojek"],
  },
  {
    name: "OVO",
    slug: "ovo",
    category: "e-wallet",
    logoUrl: "/banks/ovo.svg",
    aliases: ["ovo"],
  },
  {
    name: "LinkAja",
    slug: "linkaja",
    category: "e-wallet",
    logoUrl: "/banks/linkaja.svg",
    aliases: ["linkaja"],
  },
];

let cachedFullDataset: BankItem[] | null = null;

/**
 * Fetches the full dataset of Indonesian financial logos from GitHub
 */
export async function fetchFullBankDataset(): Promise<BankItem[]> {
  if (cachedFullDataset && cachedFullDataset.length > 0) {
    return cachedFullDataset;
  }

  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/idn-finlogos@2/dist/manifest.json");
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data?.logos && Array.isArray(data.logos)) {
      const items: BankItem[] = data.logos
        .filter((l: any) => l.category === "bank-logo" || l.category === "e-wallet")
        .map((l: any) => ({
          name: l.name,
          slug: l.slug,
          category: l.category,
          logoUrl: getBankIconUrl(l.slug),
          aliases: Array.isArray(l.aliases) ? l.aliases : [],
        }));

      // Combine with curated list to ensure clean names and codes
      const mergedMap = new Map<string, BankItem>();
      POPULAR_INDONESIAN_BANKS.forEach((b) => mergedMap.set(b.slug, b));
      items.forEach((it: BankItem) => {
        if (!mergedMap.has(it.slug)) {
          mergedMap.set(it.slug, it);
        }
      });

      cachedFullDataset = Array.from(mergedMap.values());
      return cachedFullDataset;
    }
  } catch (err) {
    console.warn("[BankData] Falling back to curated local list:", err);
  }

  return POPULAR_INDONESIAN_BANKS;
}

/**
 * Auto-detects matching bank and logo from input string (e.g. "BSI", "Bank BCA", "Mandiri 008")
 */
export function autoDetectBankLogo(
  query: string,
  dataset: BankItem[] = POPULAR_INDONESIAN_BANKS
): BankItem | null {
  if (!query || !query.trim()) return null;
  const q = query.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Exact match on slug or code
  const exact = dataset.find(
    (b) => b.slug.toLowerCase().replace(/[^a-z0-9]/g, "") === q || b.code === query.trim()
  );
  if (exact) return exact;

  // 2. Exact match on aliases
  const aliasMatch = dataset.find((b) =>
    (b.aliases || []).some((a) => a.toLowerCase().replace(/[^a-z0-9]/g, "") === q)
  );
  if (aliasMatch) return aliasMatch;

  // 3. Normalized name inclusion
  const partialMatch = dataset.find((b) => {
    const normName = b.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normName.includes(q) || q.includes(normName);
  });
  if (partialMatch) return partialMatch;

  // 4. Word boundary check
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  for (const token of tokens) {
    const tokenMatch = dataset.find((b) => {
      const normSlug = b.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normName = b.name.toLowerCase();
      return (
        normSlug === token ||
        normName.includes(token) ||
        (b.aliases || []).some((a) => a.toLowerCase().includes(token))
      );
    });
    if (tokenMatch) return tokenMatch;
  }

  return null;
}
