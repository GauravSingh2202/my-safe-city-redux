
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const email = "admin@mysafecity.com";
  const password = "Admin@123456";

  // Create user via admin API
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Admin User" },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
  }

  // Assign admin role
  const { error: roleError } = await supabase
    .from("user_roles")
    .update({ role: "admin" })
    .eq("user_id", userData.user.id);

  if (roleError) {
    return new Response(JSON.stringify({ error: roleError.message }), { status: 400 });
  }

  return new Response(JSON.stringify({
    message: "Admin user created",
    email,
    password,
  }), { headers: { "Content-Type": "application/json" } });
});
