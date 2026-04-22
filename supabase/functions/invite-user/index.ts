import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface InviteUserRequest {
  email: string;
  fullName: string;
  role: string;
  coordinatorId?: string;
  area?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token to verify permissions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user via getClaims (supports ES256 signing-keys)
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Error getting claims:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const currentUser = { id: claimsData.claims.sub };

    // Check if user is admin using the has_role function
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin, error: roleError } = await adminClient.rpc('has_role', {
      _user_id: currentUser.id,
      _role: 'admin',
    });

    if (roleError) {
      console.error('Error checking role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem convidar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, fullName, role, coordinatorId, area }: InviteUserRequest = await req.json();

    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, nome e perfil são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['admin', 'gerente', 'lider', 'calculista', 'financeiro', 'socio', 'coordenador', 'usuario', 'advogado'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Perfil inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Inviting user: ${email} with role: ${role}`);

    // Invite user using Admin API
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
      },
      redirectTo: `${req.headers.get('origin') || 'https://id-preview--3743ffcc-098a-4cb7-9157-2b7bc346a365.lovable.app'}/`,
    });

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      
      // Check if user already exists
      if (inviteError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este e-mail já está cadastrado no sistema' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erro ao enviar convite: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!inviteData.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = inviteData.user.id;
    console.log(`User created with ID: ${newUserId}`);

    // Check if a profile already exists for this email (e.g. from batch import)
    // If so, update its user_id to match the new auth user instead of creating a duplicate
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .neq('user_id', newUserId)
      .maybeSingle();

    if (existingProfile) {
      const oldUserId = existingProfile.user_id;
      console.log(`Found existing profile with old user_id ${oldUserId}, relinking to ${newUserId}`);

      // Relink all FK references from old user_id to new auth user_id
      await adminClient.from('timesheet_entries').update({ user_id: newUserId }).eq('user_id', oldUserId);
      await adminClient.from('calendar_events').update({ user_id: newUserId }).eq('user_id', oldUserId);
      await adminClient.from('bonus_calculations').update({ user_id: newUserId }).eq('user_id', oldUserId);
      await adminClient.rpc('execute_sql', { sql: '' }).catch(() => {}); // no-op, just in case

      // Update process_deadlines assigned_to and completed_by
      await adminClient.from('process_deadlines').update({ assigned_to: newUserId }).eq('assigned_to', oldUserId);
      await adminClient.from('process_deadlines').update({ completed_by: newUserId }).eq('completed_by', oldUserId);

      // Delete old user_roles, then update or create
      await adminClient.from('user_roles').delete().eq('user_id', oldUserId);

      // Update the old profile to point to new auth user
      const { error: relinkError } = await adminClient
        .from('profiles')
        .update({
          user_id: newUserId,
          full_name: fullName,
          area: area || null,
          reports_to: coordinatorId || null,
          is_active: true,
        })
        .eq('user_id', oldUserId);

      if (relinkError) {
        console.error('Error relinking profile:', relinkError);
        // Fallback: delete old and create new
        await adminClient.from('profiles').delete().eq('user_id', oldUserId);
        await adminClient.from('profiles').upsert({
          user_id: newUserId,
          full_name: fullName,
          email: email,
          area: area || null,
          reports_to: coordinatorId || null,
          is_active: true,
        });
      }
    } else {
      // No pre-existing profile, create or upsert (handle_new_user trigger may have created one)
      const { error: profileError } = await adminClient.from('profiles').upsert({
        user_id: newUserId,
        full_name: fullName,
        email: email,
        area: area || null,
        reports_to: coordinatorId || null,
        is_active: true,
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    // Assign role (upsert to avoid conflicts with handle_new_user trigger)
    await adminClient.from('user_roles').delete().eq('user_id', newUserId);
    const { error: roleInsertError } = await adminClient.from('user_roles').insert({
      user_id: newUserId,
      role: role,
    });

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
    }

    console.log(`User ${email} invited successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Convite enviado com sucesso',
        userId: newUserId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in invite-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: `Erro interno: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
