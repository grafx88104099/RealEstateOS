// GET /api/admin/analytics
// Returns agent performance metrics for the tenant admin dashboard

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const tenantId = auth.tenantId;

  // Fetch all agents
  const { data: agents } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, is_active, created_at")
    .eq("tenant_id", tenantId)
    .eq("role", "agent")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (!agents || agents.length === 0) {
    return NextResponse.json({ agents: [], summary: null });
  }

  const agentIds = agents.map((a) => a.id);

  // Fetch listings per agent
  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("id, agent_id, status, price, created_at")
    .eq("tenant_id", tenantId)
    .in("agent_id", agentIds)
    .is("deleted_at", null);

  // Fetch inquiries per agent
  const { data: inquiries } = await supabaseAdmin
    .from("inquiries")
    .select("id, agent_id, status, created_at, contacted_at")
    .eq("tenant_id", tenantId)
    .in("agent_id", agentIds)
    .is("deleted_at", null);

  // Calculate per-agent metrics
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const agentMetrics = agents.map((agent) => {
    const agentListings = listings?.filter((l) => l.agent_id === agent.id) ?? [];
    const agentInquiries = inquiries?.filter((i) => i.agent_id === agent.id) ?? [];

    const activeListings = agentListings.filter((l) => l.status === "active").length;
    const soldListings = agentListings.filter((l) => l.status === "sold").length;
    const totalListings = agentListings.length;

    const totalInquiries = agentInquiries.length;
    const newInquiries = agentInquiries.filter((i) => i.status === "new").length;
    const closedWon = agentInquiries.filter((i) => i.status === "closed_won").length;
    const closedLost = agentInquiries.filter((i) => i.status === "closed_lost").length;

    const conversionRate = totalInquiries > 0
      ? Math.round((closedWon / totalInquiries) * 100)
      : 0;

    // Average response time (time from created_at to contacted_at)
    const respondedInquiries = agentInquiries.filter((i) => i.contacted_at);
    let avgResponseHours = 0;
    if (respondedInquiries.length > 0) {
      const totalHours = respondedInquiries.reduce((sum, i) => {
        const diff = new Date(i.contacted_at!).getTime() - new Date(i.created_at).getTime();
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      avgResponseHours = Math.round((totalHours / respondedInquiries.length) * 10) / 10;
    }

    // Last 30 days activity
    const recentListings = agentListings.filter(
      (l) => new Date(l.created_at).getTime() > thirtyDaysAgo
    ).length;
    const recentInquiries = agentInquiries.filter(
      (i) => new Date(i.created_at).getTime() > thirtyDaysAgo
    ).length;

    // Total sales value
    const salesValue = agentListings
      .filter((l) => l.status === "sold")
      .reduce((sum, l) => sum + Number(l.price), 0);

    return {
      id: agent.id,
      full_name: agent.full_name,
      email: agent.email,
      is_active: agent.is_active,
      total_listings: totalListings,
      active_listings: activeListings,
      sold_listings: soldListings,
      total_inquiries: totalInquiries,
      new_inquiries: newInquiries,
      closed_won: closedWon,
      closed_lost: closedLost,
      conversion_rate: conversionRate,
      avg_response_hours: avgResponseHours,
      recent_listings_30d: recentListings,
      recent_inquiries_30d: recentInquiries,
      sales_value: salesValue,
    };
  });

  // Sort by performance score (weighted)
  agentMetrics.sort((a, b) => {
    const scoreA = a.conversion_rate * 2 + a.sold_listings * 10 + a.total_listings * 3 - a.new_inquiries * 2;
    const scoreB = b.conversion_rate * 2 + b.sold_listings * 10 + b.total_listings * 3 - b.new_inquiries * 2;
    return scoreB - scoreA;
  });

  // Summary
  const totalSold = agentMetrics.reduce((s, a) => s + a.sold_listings, 0);
  const totalSalesValue = agentMetrics.reduce((s, a) => s + a.sales_value, 0);
  const totalAllInquiries = agentMetrics.reduce((s, a) => s + a.total_inquiries, 0);
  const totalClosedWon = agentMetrics.reduce((s, a) => s + a.closed_won, 0);
  const overallConversion = totalAllInquiries > 0
    ? Math.round((totalClosedWon / totalAllInquiries) * 100) : 0;

  return NextResponse.json({
    agents: agentMetrics,
    summary: {
      total_agents: agents.length,
      active_agents: agents.filter((a) => a.is_active).length,
      total_sold: totalSold,
      total_sales_value: totalSalesValue,
      total_inquiries: totalAllInquiries,
      overall_conversion: overallConversion,
    },
  });
}
