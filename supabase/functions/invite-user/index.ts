import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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
    // If so, relink ALL related rows to the new auth user_id and merge the profile.
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('user_id, full_name, area, reports_to, avatar_url')
      .eq('email', email)
      .neq('user_id', newUserId)
      .maybeSingle();

    let profileOk = false;
    let roleOk = false;

    if (existingProfile) {
      const oldUserId = existingProfile.user_id;
      console.log(`Found existing profile (old user_id ${oldUserId}); relinking to ${newUserId}`);

      const relinks: Array<[string, string]> = [
        ['timesheet_entries', 'user_id'],
        ['timesheet_entries', 'approved_by'],
        ['calendar_events', 'user_id'],
        ['bonus_calculations', 'user_id'],
        ['bonus_calculations', 'approved_by'],
        ['bonus_calculations', 'billed_by'],
        ['bonus_provisions', 'user_id'],
        ['process_deadlines', 'assigned_to'],
        ['process_deadlines', 'completed_by'],
        ['solicitacoes', 'assigned_to'],
        ['solicitacoes', 'created_by'],
        ['team_clients', 'created_by'],
        ['user_aliases', 'user_id'],
        ['user_aliases', 'created_by'],
        ['access_logs', 'user_id'],
        ['audit_logs', 'user_id'],
        ['bank_statements', 'uploaded_by'],
        ['billing_contacts', 'created_by'],
        ['billing_previews', 'created_by'],
        ['boletos', 'created_by'],
        ['client_aliases', 'created_by'],
        ['client_documents', 'uploaded_by'],
        ['clients', 'created_by'],
        ['contract_extractions', 'created_by'],
        ['expenses', 'created_by'],
        ['invoices', 'created_by'],
        ['processes', 'created_by'],
        ['related_processes', 'created_by'],
        ['accounts', 'created_by'],
        ['treasury_entries', 'created_by'],
      ];
      for (const [table, col] of relinks) {
        const { error } = await adminClient.from(table).update({ [col]: newUserId }).eq(col, oldUserId);
        if (error) console.warn(`relink ${table}.${col} failed:`, error.message);
      }

      await adminClient.from('user_roles').delete().eq('user_id', newUserId);
      await adminClient.from('user_roles').update({ user_id: newUserId }).eq('user_id', oldUserId);
      await adminClient.from('user_permission_overrides').delete().eq('user_id', newUserId);
      await adminClient.from('user_permission_overrides').update({ user_id: newUserId }).eq('user_id', oldUserId);

      const { data: triggerProfile } = await adminClient
        .from('profiles').select('user_id').eq('user_id', newUserId).maybeSingle();

      if (triggerProfile) {
        const { error: mergeErr } = await adminClient.from('profiles').update({
          full_name: fullName || existingProfile.full_name,
          area: area || existingProfile.area,
          reports_to: coordinatorId || existingProfile.reports_to,
          avatar_url: existingProfile.avatar_url,
          is_active: true,
        }).eq('user_id', newUserId);
        if (mergeErr) console.error('Merge profile error:', mergeErr);
        await adminClient.from('profiles').delete().eq('user_id', oldUserId);
      } else {
        const { error: relinkErr } = await adminClient.from('profiles').update({
          user_id: newUserId,
          full_name: fullName,
          area: area || existingProfile.area,
          reports_to: coordinatorId || existingProfile.reports_to,
          is_active: true,
        }).eq('user_id', oldUserId);
        if (relinkErr) console.error('Relink profile error:', relinkErr);
      }
    }

    // Final upsert to guarantee the profile exists with correct fields
    const { error: profileError } = await adminClient.from('profiles').upsert({
      user_id: newUserId,
      full_name: fullName,
      email: email,
      area: area || null,
      reports_to: coordinatorId || null,
      is_active: true,
    }, { onConflict: 'user_id' });

    if (profileError) {
      console.error('Error ensuring profile:', profileError);
    } else {
      profileOk = true;
    }

    await adminClient.from('user_roles').delete().eq('user_id', newUserId);
    const { error: roleInsertError } = await adminClient.from('user_roles').insert({
      user_id: newUserId,
      role: role,
    });

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
    } else {
      roleOk = true;
    }

    // Fail loudly if profile or role could not be persisted
    if (!profileOk || !roleOk) {
      return new Response(
        JSON.stringify({
          error: 'Usuário criado no auth, mas falhou ao gravar profile/role. Verifique os logs.',
          userId: newUserId,
          profileOk,
          roleOk,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
