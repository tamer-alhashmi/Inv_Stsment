import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UserPayload {
  email: string;
  password: string;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Extract caller's user ID from JWT (gateway already verified it with verifyJWT=true)
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    let callerId = "";
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      callerId = payload.sub;
    } catch {
      return jsonResponse(401, { error: "Unauthorized" });
    }
    if (!callerId) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    // Check caller's role via profiles
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, email")
      .eq("id", callerId)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return jsonResponse(403, { error: "Admin access required" });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";
    const method = req.method;

    // GET: list all users with profiles
    if (method === "GET") {
      const { data: usersList, error: listErr } = await adminClient.auth.admin.listUsers();
      if (listErr) return jsonResponse(500, { error: "Failed to list users" });

      const { data: profiles } = await adminClient.from("profiles").select("id, role, created_at");

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const result = usersList.users.map((u: any) => ({
        id: u.id,
        email: u.email || "",
        role: profileMap.get(u.id)?.role || "user",
        created_at: u.created_at,
      }));

      return jsonResponse(200, { users: result });
    }

    // POST: create user
    if (method === "POST" && action === "create") {
      const body = await req.json() as UserPayload;
      if (!body.email || !body.password) {
        return jsonResponse(400, { error: "Email and password required" });
      }
      if (body.role !== "admin" && body.role !== "user") {
        return jsonResponse(400, { error: "Invalid role" });
      }

      const { data: newUserData, error: createErr } = await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

      if (createErr) {
        return jsonResponse(400, { error: createErr.message });
      }

      // Set role in profiles (service role bypasses the trigger)
      await adminClient.from("profiles")
        .update({ role: body.role })
        .eq("id", newUserData.user.id);

      // Log to user_history
      await adminClient.from("user_history").insert({
        action_type: "create",
        target_email: body.email,
        target_role: body.role,
        performed_by_email: callerProfile.email,
        details: `User created with role: ${body.role}`,
      });

      return jsonResponse(201, { success: true, user: { id: newUserData.user.id, email: body.email, role: body.role } });
    }

    // PUT: update user role or password
    if (method === "PUT" && action === "update") {
      const body = await req.json() as { user_id: string; email: string; role?: string; password?: string };
      if (!body.user_id) return jsonResponse(400, { error: "user_id required" });

      if (body.role) {
        await adminClient.from("profiles")
          .update({ role: body.role })
          .eq("id", body.user_id);

        await adminClient.from("user_history").insert({
          action_type: "role_change",
          target_email: body.email,
          target_role: body.role,
          performed_by_email: callerProfile.email,
          details: `Role changed to: ${body.role}`,
        });
      }

      if (body.password) {
        const { error: pwdErr } = await adminClient.auth.admin.updateUserById(body.user_id, {
          password: body.password,
        });
        if (pwdErr) return jsonResponse(400, { error: pwdErr.message });

        await adminClient.from("user_history").insert({
          action_type: "update",
          target_email: body.email,
          target_role: body.role || null,
          performed_by_email: callerProfile.email,
          details: "Password updated",
        });
      }

      return jsonResponse(200, { success: true });
    }

    // DELETE: remove user
    if (method === "DELETE") {
      const body = await req.json() as { user_id: string; email: string };
      if (!body.user_id) return jsonResponse(400, { error: "user_id required" });

      const { error: delErr } = await adminClient.auth.admin.deleteUser(body.user_id);
      if (delErr) return jsonResponse(400, { error: delErr.message });

      await adminClient.from("user_history").insert({
        action_type: "delete",
        target_email: body.email,
        target_role: null,
        performed_by_email: callerProfile.email,
        details: "User deleted",
      });

      return jsonResponse(200, { success: true });
    }

    return jsonResponse(404, { error: "Not found" });
  } catch (err) {
    return jsonResponse(500, { error: err.message || "Internal server error" });
  }
});

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
