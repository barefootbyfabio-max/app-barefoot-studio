import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { studentId, reactivate } = await req.json();
    if (!studentId) {
      return new Response(
        JSON.stringify({ error: "ID do aluno é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub;

    // Verify caller is professor
    const { data: callerProfile, error: callerError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (callerError || !callerProfile || callerProfile.role !== "professor") {
      return new Response(
        JSON.stringify({ error: "Apenas professores podem gerenciar alunos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify target is a student
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("role, name, email")
      .eq("id", studentId)
      .single();

    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "Aluno não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetProfile.role !== "aluno") {
      return new Response(
        JSON.stringify({ error: "Não é possível gerenciar usuários que não são alunos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === REACTIVATE ===
    if (reactivate) {
      console.log(`Reactivating student: ${studentId}`);

      // Mark profile as active
      await supabaseAdmin
        .from("profiles")
        .update({ is_active: true })
        .eq("id", studentId);

      // Unban user in auth
      await supabaseAdmin.auth.admin.updateUserById(studentId, {
        ban_duration: "none",
      });

      return new Response(
        JSON.stringify({ success: true, message: "Aluno reativado com sucesso" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === DEACTIVATE (soft-delete) ===
    console.log(`Deactivating student: ${targetProfile.name || targetProfile.email}`);

    const today = new Date().toISOString().split("T")[0];

    // 1. Mark profile as inactive
    await supabaseAdmin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", studentId);

    // 2. Deactivate student plan
    await supabaseAdmin
      .from("student_plans")
      .update({ is_active: false })
      .eq("student_id", studentId)
      .eq("is_active", true);

    // 3. Cancel future bookings
    await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelado" })
      .eq("aluno_id", studentId)
      .gte("booking_date", today)
      .eq("status", "confirmado");

    // 4. End fixed bookings
    await supabaseAdmin
      .from("fixed_bookings")
      .update({ end_date: today })
      .eq("aluno_id", studentId)
      .eq("approval_status", "approved")
      .or("end_date.is.null,end_date.gte." + today);

    // 5. Ban user in auth to prevent login
    await supabaseAdmin.auth.admin.updateUserById(studentId, {
      ban_duration: "876000h",
    });

    console.log(`Successfully deactivated student: ${studentId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Aluno desativado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
