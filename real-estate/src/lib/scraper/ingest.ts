// lib/scraper/ingest.ts
// Auto-promotion pipeline: scraped_listings → listings (status='pending_review').
//
// Phase A:
//   - confidence gate
//   - rule-based spam check
//   - required fields check
//   - image download to Storage
//   - INSERT listings (always pending_review until super admin approves)
//   - listing_images rows
//
// Phase B (later):
//   - LLM spam classifier when verdict='uncertain'
//   - cross-source semantic dedup against active listings
//   - tenant-controlled auto_promote → status='active'

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { checkSpam } from "./spam-rules";
import { uploadListingImages } from "./image-upload";
import { judgeSpamWithLlm } from "./llm-spam";
import { checkDedup } from "./dedup";
import { addClassifier, addEmbedding, type TokenUsage } from "./cost";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export interface SourceConfig {
  id: string;
  base_url: string;
  target_tenant_id: string | null;
  confidence_threshold: number;
  spam_threshold: number;
  auto_promote: boolean;
}

export interface IngestStats {
  considered: number;
  promoted: number;
  blocked: Record<string, number>; // blocker_reason -> count
  usage?: TokenUsage;
}

const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// Resolve the system user that auto-imported listings will be attributed to.
// listings.agent_id is NOT NULL, so we need a real user. Picks the first
// super_admin/tenant_admin/agent in the target tenant.
async function resolveSystemAgentId(tenantId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("role", ["super_admin", "tenant_admin", "agent"])
    .order("role", { ascending: true })
    .limit(1)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

export async function ingestNewScraped(
  source: SourceConfig,
  scrapedRowIds: string[],
  usage?: TokenUsage,
): Promise<IngestStats> {
  const stats: IngestStats = { considered: 0, promoted: 0, blocked: {}, usage };
  if (scrapedRowIds.length === 0) return stats;

  const { data: rows } = await supabaseAdmin
    .from("scraped_listings")
    .select(
      `id, title, description, price, rooms, area_sqm, floor, total_floors,
       district, address, property_type, listing_type, contact_phone,
       images, raw_text, ai_confidence, source_site, source_ext_id, source_url`,
    )
    .in("id", scrapedRowIds);

  type Row = {
    id: string;
    title: string | null;
    description: string | null;
    price: number | null;
    rooms: number | null;
    area_sqm: number | null;
    floor: number | null;
    total_floors: number | null;
    district: string | null;
    address: string | null;
    property_type: string | null;
    listing_type: string | null;
    contact_phone: string | null;
    images: string[] | null;
    raw_text: string | null;
    ai_confidence: number | null;
    source_site: string;
    source_ext_id: string | null;
    source_url: string | null;
  };

  const list = (rows as Row[] | null) ?? [];
  const tenantId = source.target_tenant_id ?? PLATFORM_TENANT_ID;
  const systemAgentId = await resolveSystemAgentId(tenantId);
  if (!systemAgentId) {
    return {
      ...stats,
      blocked: { no_system_agent: list.length },
      considered: list.length,
    };
  }

  for (const r of list) {
    stats.considered++;

    const block = (reason: string) => {
      stats.blocked[reason] = (stats.blocked[reason] ?? 0) + 1;
      void supabaseAdmin
        .from("scraped_listings")
        .update({ promotion_blocker: reason })
        .eq("id", r.id);
    };

    // 1. Confidence gate
    if ((r.ai_confidence ?? 0) < source.confidence_threshold) {
      block("low_confidence");
      continue;
    }

    // 2. Required fields
    if (!r.title || r.price == null || !r.district || !r.property_type) {
      block("missing_required_fields");
      continue;
    }

    // 3a. Spam — rule layer
    const ruleSpam = checkSpam({
      title: r.title,
      raw_text: r.raw_text,
      price: r.price,
      area_sqm: r.area_sqm,
      contact_phone: r.contact_phone,
    });
    let spamScore = ruleSpam.score;
    let spamReasons = ruleSpam.reasons;

    if (ruleSpam.verdict === "spam") {
      await supabaseAdmin.from("scraped_listings").update({ spam_score: spamScore }).eq("id", r.id);
      block(`spam:${spamReasons[0] ?? "rule"}`);
      continue;
    }

    // 3b. LLM judge (only when uncertain) — Phase B
    if (ruleSpam.verdict === "uncertain") {
      const llm = await judgeSpamWithLlm({
        title: r.title,
        price: r.price,
        raw_text: r.raw_text,
        district: r.district,
      });
      if (usage && llm.tokens) {
        addClassifier(usage, llm.tokens.input, llm.tokens.output);
      }
      spamScore = Math.max(spamScore, llm.score);
      if (llm.reasons.length > 0) spamReasons = [...spamReasons, ...llm.reasons];
    }

    if (spamScore >= source.spam_threshold) {
      await supabaseAdmin.from("scraped_listings").update({ spam_score: spamScore }).eq("id", r.id);
      block(`spam:${spamReasons[0] ?? "llm"}`);
      continue;
    }

    // 3c. Cross-source semantic dedup
    const dedup = await checkDedup({
      title: r.title,
      district: r.district,
      price: r.price,
      tenantId,
    });
    if (usage) addEmbedding(usage, dedup.embedding_tokens);

    if (dedup.matched_listing_id) {
      await supabaseAdmin
        .from("scraped_listings")
        .update({
          spam_score: spamScore,
          dedup_match_listing_id: dedup.matched_listing_id,
          status: "rejected",
        })
        .eq("id", r.id);
      block("dedup_match");
      continue;
    }

    // 4. Insert listing (always pending_review in Phase A)
    const slug = `auto-${r.source_site}-${r.source_ext_id ?? r.id}`.slice(0, 80);
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("listings")
      .insert({
        tenant_id: tenantId,
        agent_id: systemAgentId,
        title: r.title,
        slug,
        description: r.description,
        price: r.price,
        rooms: r.rooms,
        area_sqm: r.area_sqm,
        floor: r.floor,
        total_floors: r.total_floors,
        district: r.district,
        address: r.address,
        property_type: r.property_type,
        listing_type: r.listing_type ?? "sale",
        status: "pending_review",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      block(`insert_error:${(insertErr?.message ?? "").slice(0, 60)}`);
      continue;
    }

    const newListingId = (inserted as { id: string }).id;

    // 5. Image upload
    const sourceImgs = (r.images ?? []).filter(Boolean);
    if (sourceImgs.length > 0) {
      const result = await uploadListingImages(newListingId, sourceImgs, {
        referer: source.base_url,
      });
      if (result.uploaded.length === 0 && sourceImgs.length > 0) {
        // No image survived — keep listing but record blocker note
        await supabaseAdmin
          .from("scraped_listings")
          .update({ promotion_blocker: "image_fetch_failed" })
          .eq("id", r.id);
      }
      // Insert listing_images rows
      for (let i = 0; i < result.uploaded.length; i++) {
        const img = result.uploaded[i];
        await supabaseAdmin.from("listing_images").insert({
          listing_id: newListingId,
          url: img.url,
          sort_order: i,
          is_cover: img.is_cover,
        });
      }
    }

    // 6. Mark scraped row
    await supabaseAdmin
      .from("scraped_listings")
      .update({
        status: "approved",
        imported_listing_id: newListingId,
        auto_promoted_at: new Date().toISOString(),
        spam_score: spamScore,
      })
      .eq("id", r.id);

    stats.promoted++;
  }

  return stats;
}
