import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { error } = await supabase.from("survey_responses").insert({
      last_name: body.lastName,
      first_name: body.firstName,
      phone: body.phone || null,
      email: body.email || null,
      us_state: body.usState || null,
      contact_time: body.contactTime || null,
      contact_method: body.contactMethod || [],
      property_type: body.propType || [],
      property_location: body.propLocation || [],
      property_purpose: body.propPurpose || [],
      budget: body.budget || null,
      urgency: body.urgency || null,
      financing: body.financing || null,
      prev_property: body.prevProperty || null,
      notes: body.notes || null,
      hear_about: body.hearAbout || [],
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
