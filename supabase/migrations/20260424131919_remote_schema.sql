create extension if not exists "unaccent" with schema "public";

drop policy "Admins can manage clients" on "public"."clients";

drop policy "Authenticated users can view active clients" on "public"."clients";

drop policy "Authenticated can read custom_roles" on "public"."custom_roles";

drop policy "Allow authenticated users full access to expenses" on "public"."expenses";

drop policy "Allow authenticated users full access to invoices" on "public"."invoices";

drop policy "Authenticated finance leaders coordinators can view invoices" on "public"."invoices";

drop policy "Finance and leaders can insert invoices" on "public"."invoices";

drop policy "Finance and leaders can update invoices" on "public"."invoices";

drop policy "Only admins can delete invoices" on "public"."invoices";

drop policy "Authenticated can read permissions" on "public"."permissions";

drop policy "Authenticated users can manage deadlines" on "public"."process_deadlines";

drop policy "Users can insert own profile" on "public"."profiles";

drop policy "Users can update own profile" on "public"."profiles";

drop policy "Authenticated can read role_permissions" on "public"."role_permissions";

drop policy "Authenticated users can view solicitacoes" on "public"."solicitacoes";

drop policy "Admins can manage roles" on "public"."user_roles";

drop policy "Authenticated users can view all roles" on "public"."user_roles";

drop policy "Authenticated users can view all active profiles" on "public"."profiles";

revoke delete on table "public"."access_logs" from "anon";

revoke insert on table "public"."access_logs" from "anon";

revoke references on table "public"."access_logs" from "anon";

revoke trigger on table "public"."access_logs" from "anon";

revoke truncate on table "public"."access_logs" from "anon";

revoke update on table "public"."access_logs" from "anon";

revoke references on table "public"."access_logs" from "authenticated";

revoke trigger on table "public"."access_logs" from "authenticated";

revoke truncate on table "public"."access_logs" from "authenticated";

revoke delete on table "public"."access_logs" from "service_role";

revoke insert on table "public"."access_logs" from "service_role";

revoke references on table "public"."access_logs" from "service_role";

revoke select on table "public"."access_logs" from "service_role";

revoke trigger on table "public"."access_logs" from "service_role";

revoke truncate on table "public"."access_logs" from "service_role";

revoke update on table "public"."access_logs" from "service_role";

revoke delete on table "public"."accounts" from "anon";

revoke insert on table "public"."accounts" from "anon";

revoke references on table "public"."accounts" from "anon";

revoke trigger on table "public"."accounts" from "anon";

revoke truncate on table "public"."accounts" from "anon";

revoke update on table "public"."accounts" from "anon";

revoke references on table "public"."accounts" from "authenticated";

revoke trigger on table "public"."accounts" from "authenticated";

revoke truncate on table "public"."accounts" from "authenticated";

revoke delete on table "public"."accounts" from "service_role";

revoke insert on table "public"."accounts" from "service_role";

revoke references on table "public"."accounts" from "service_role";

revoke select on table "public"."accounts" from "service_role";

revoke trigger on table "public"."accounts" from "service_role";

revoke truncate on table "public"."accounts" from "service_role";

revoke update on table "public"."accounts" from "service_role";

revoke delete on table "public"."activity_types" from "anon";

revoke insert on table "public"."activity_types" from "anon";

revoke references on table "public"."activity_types" from "anon";

revoke trigger on table "public"."activity_types" from "anon";

revoke truncate on table "public"."activity_types" from "anon";

revoke update on table "public"."activity_types" from "anon";

revoke references on table "public"."activity_types" from "authenticated";

revoke trigger on table "public"."activity_types" from "authenticated";

revoke truncate on table "public"."activity_types" from "authenticated";

revoke delete on table "public"."activity_types" from "service_role";

revoke insert on table "public"."activity_types" from "service_role";

revoke references on table "public"."activity_types" from "service_role";

revoke trigger on table "public"."activity_types" from "service_role";

revoke truncate on table "public"."activity_types" from "service_role";

revoke update on table "public"."activity_types" from "service_role";

revoke delete on table "public"."agent_executions" from "anon";

revoke insert on table "public"."agent_executions" from "anon";

revoke references on table "public"."agent_executions" from "anon";

revoke trigger on table "public"."agent_executions" from "anon";

revoke truncate on table "public"."agent_executions" from "anon";

revoke update on table "public"."agent_executions" from "anon";

revoke references on table "public"."agent_executions" from "authenticated";

revoke trigger on table "public"."agent_executions" from "authenticated";

revoke truncate on table "public"."agent_executions" from "authenticated";

revoke delete on table "public"."agent_executions" from "service_role";

revoke insert on table "public"."agent_executions" from "service_role";

revoke references on table "public"."agent_executions" from "service_role";

revoke select on table "public"."agent_executions" from "service_role";

revoke trigger on table "public"."agent_executions" from "service_role";

revoke truncate on table "public"."agent_executions" from "service_role";

revoke update on table "public"."agent_executions" from "service_role";

revoke delete on table "public"."area_goals" from "anon";

revoke insert on table "public"."area_goals" from "anon";

revoke references on table "public"."area_goals" from "anon";

revoke trigger on table "public"."area_goals" from "anon";

revoke truncate on table "public"."area_goals" from "anon";

revoke update on table "public"."area_goals" from "anon";

revoke references on table "public"."area_goals" from "authenticated";

revoke trigger on table "public"."area_goals" from "authenticated";

revoke truncate on table "public"."area_goals" from "authenticated";

revoke delete on table "public"."area_goals" from "service_role";

revoke insert on table "public"."area_goals" from "service_role";

revoke references on table "public"."area_goals" from "service_role";

revoke select on table "public"."area_goals" from "service_role";

revoke trigger on table "public"."area_goals" from "service_role";

revoke truncate on table "public"."area_goals" from "service_role";

revoke update on table "public"."area_goals" from "service_role";

revoke delete on table "public"."audit_logs" from "anon";

revoke insert on table "public"."audit_logs" from "anon";

revoke references on table "public"."audit_logs" from "anon";

revoke trigger on table "public"."audit_logs" from "anon";

revoke truncate on table "public"."audit_logs" from "anon";

revoke update on table "public"."audit_logs" from "anon";

revoke references on table "public"."audit_logs" from "authenticated";

revoke trigger on table "public"."audit_logs" from "authenticated";

revoke truncate on table "public"."audit_logs" from "authenticated";

revoke delete on table "public"."audit_logs" from "service_role";

revoke insert on table "public"."audit_logs" from "service_role";

revoke references on table "public"."audit_logs" from "service_role";

revoke select on table "public"."audit_logs" from "service_role";

revoke trigger on table "public"."audit_logs" from "service_role";

revoke truncate on table "public"."audit_logs" from "service_role";

revoke update on table "public"."audit_logs" from "service_role";

revoke delete on table "public"."authorized_email_domains" from "anon";

revoke insert on table "public"."authorized_email_domains" from "anon";

revoke references on table "public"."authorized_email_domains" from "anon";

revoke select on table "public"."authorized_email_domains" from "anon";

revoke trigger on table "public"."authorized_email_domains" from "anon";

revoke truncate on table "public"."authorized_email_domains" from "anon";

revoke update on table "public"."authorized_email_domains" from "anon";

revoke delete on table "public"."authorized_email_domains" from "authenticated";

revoke insert on table "public"."authorized_email_domains" from "authenticated";

revoke references on table "public"."authorized_email_domains" from "authenticated";

revoke select on table "public"."authorized_email_domains" from "authenticated";

revoke trigger on table "public"."authorized_email_domains" from "authenticated";

revoke truncate on table "public"."authorized_email_domains" from "authenticated";

revoke update on table "public"."authorized_email_domains" from "authenticated";

revoke delete on table "public"."authorized_email_domains" from "service_role";

revoke insert on table "public"."authorized_email_domains" from "service_role";

revoke references on table "public"."authorized_email_domains" from "service_role";

revoke select on table "public"."authorized_email_domains" from "service_role";

revoke trigger on table "public"."authorized_email_domains" from "service_role";

revoke truncate on table "public"."authorized_email_domains" from "service_role";

revoke update on table "public"."authorized_email_domains" from "service_role";

revoke delete on table "public"."bank_accounts_config" from "anon";

revoke insert on table "public"."bank_accounts_config" from "anon";

revoke references on table "public"."bank_accounts_config" from "anon";

revoke trigger on table "public"."bank_accounts_config" from "anon";

revoke truncate on table "public"."bank_accounts_config" from "anon";

revoke update on table "public"."bank_accounts_config" from "anon";

revoke references on table "public"."bank_accounts_config" from "authenticated";

revoke trigger on table "public"."bank_accounts_config" from "authenticated";

revoke truncate on table "public"."bank_accounts_config" from "authenticated";

revoke delete on table "public"."bank_accounts_config" from "service_role";

revoke insert on table "public"."bank_accounts_config" from "service_role";

revoke references on table "public"."bank_accounts_config" from "service_role";

revoke select on table "public"."bank_accounts_config" from "service_role";

revoke trigger on table "public"."bank_accounts_config" from "service_role";

revoke truncate on table "public"."bank_accounts_config" from "service_role";

revoke update on table "public"."bank_accounts_config" from "service_role";

revoke delete on table "public"."bank_statement_entries" from "anon";

revoke insert on table "public"."bank_statement_entries" from "anon";

revoke references on table "public"."bank_statement_entries" from "anon";

revoke trigger on table "public"."bank_statement_entries" from "anon";

revoke truncate on table "public"."bank_statement_entries" from "anon";

revoke update on table "public"."bank_statement_entries" from "anon";

revoke references on table "public"."bank_statement_entries" from "authenticated";

revoke trigger on table "public"."bank_statement_entries" from "authenticated";

revoke truncate on table "public"."bank_statement_entries" from "authenticated";

revoke delete on table "public"."bank_statement_entries" from "service_role";

revoke insert on table "public"."bank_statement_entries" from "service_role";

revoke references on table "public"."bank_statement_entries" from "service_role";

revoke select on table "public"."bank_statement_entries" from "service_role";

revoke trigger on table "public"."bank_statement_entries" from "service_role";

revoke truncate on table "public"."bank_statement_entries" from "service_role";

revoke update on table "public"."bank_statement_entries" from "service_role";

revoke delete on table "public"."bank_statements" from "anon";

revoke insert on table "public"."bank_statements" from "anon";

revoke references on table "public"."bank_statements" from "anon";

revoke trigger on table "public"."bank_statements" from "anon";

revoke truncate on table "public"."bank_statements" from "anon";

revoke update on table "public"."bank_statements" from "anon";

revoke references on table "public"."bank_statements" from "authenticated";

revoke trigger on table "public"."bank_statements" from "authenticated";

revoke truncate on table "public"."bank_statements" from "authenticated";

revoke delete on table "public"."bank_statements" from "service_role";

revoke insert on table "public"."bank_statements" from "service_role";

revoke references on table "public"."bank_statements" from "service_role";

revoke select on table "public"."bank_statements" from "service_role";

revoke trigger on table "public"."bank_statements" from "service_role";

revoke truncate on table "public"."bank_statements" from "service_role";

revoke update on table "public"."bank_statements" from "service_role";

revoke delete on table "public"."banks" from "anon";

revoke insert on table "public"."banks" from "anon";

revoke references on table "public"."banks" from "anon";

revoke trigger on table "public"."banks" from "anon";

revoke truncate on table "public"."banks" from "anon";

revoke update on table "public"."banks" from "anon";

revoke references on table "public"."banks" from "authenticated";

revoke trigger on table "public"."banks" from "authenticated";

revoke truncate on table "public"."banks" from "authenticated";

revoke delete on table "public"."banks" from "service_role";

revoke insert on table "public"."banks" from "service_role";

revoke references on table "public"."banks" from "service_role";

revoke select on table "public"."banks" from "service_role";

revoke trigger on table "public"."banks" from "service_role";

revoke truncate on table "public"."banks" from "service_role";

revoke update on table "public"."banks" from "service_role";

revoke delete on table "public"."billing_contacts" from "anon";

revoke insert on table "public"."billing_contacts" from "anon";

revoke references on table "public"."billing_contacts" from "anon";

revoke trigger on table "public"."billing_contacts" from "anon";

revoke truncate on table "public"."billing_contacts" from "anon";

revoke update on table "public"."billing_contacts" from "anon";

revoke references on table "public"."billing_contacts" from "authenticated";

revoke trigger on table "public"."billing_contacts" from "authenticated";

revoke truncate on table "public"."billing_contacts" from "authenticated";

revoke delete on table "public"."billing_contacts" from "service_role";

revoke insert on table "public"."billing_contacts" from "service_role";

revoke references on table "public"."billing_contacts" from "service_role";

revoke select on table "public"."billing_contacts" from "service_role";

revoke trigger on table "public"."billing_contacts" from "service_role";

revoke truncate on table "public"."billing_contacts" from "service_role";

revoke update on table "public"."billing_contacts" from "service_role";

revoke delete on table "public"."billing_preview_items" from "anon";

revoke insert on table "public"."billing_preview_items" from "anon";

revoke references on table "public"."billing_preview_items" from "anon";

revoke select on table "public"."billing_preview_items" from "anon";

revoke trigger on table "public"."billing_preview_items" from "anon";

revoke truncate on table "public"."billing_preview_items" from "anon";

revoke update on table "public"."billing_preview_items" from "anon";

revoke delete on table "public"."billing_preview_items" from "authenticated";

revoke insert on table "public"."billing_preview_items" from "authenticated";

revoke references on table "public"."billing_preview_items" from "authenticated";

revoke select on table "public"."billing_preview_items" from "authenticated";

revoke trigger on table "public"."billing_preview_items" from "authenticated";

revoke truncate on table "public"."billing_preview_items" from "authenticated";

revoke update on table "public"."billing_preview_items" from "authenticated";

revoke delete on table "public"."billing_preview_items" from "service_role";

revoke insert on table "public"."billing_preview_items" from "service_role";

revoke references on table "public"."billing_preview_items" from "service_role";

revoke select on table "public"."billing_preview_items" from "service_role";

revoke trigger on table "public"."billing_preview_items" from "service_role";

revoke truncate on table "public"."billing_preview_items" from "service_role";

revoke update on table "public"."billing_preview_items" from "service_role";

revoke delete on table "public"."billing_previews" from "anon";

revoke insert on table "public"."billing_previews" from "anon";

revoke references on table "public"."billing_previews" from "anon";

revoke select on table "public"."billing_previews" from "anon";

revoke trigger on table "public"."billing_previews" from "anon";

revoke truncate on table "public"."billing_previews" from "anon";

revoke update on table "public"."billing_previews" from "anon";

revoke delete on table "public"."billing_previews" from "authenticated";

revoke insert on table "public"."billing_previews" from "authenticated";

revoke references on table "public"."billing_previews" from "authenticated";

revoke select on table "public"."billing_previews" from "authenticated";

revoke trigger on table "public"."billing_previews" from "authenticated";

revoke truncate on table "public"."billing_previews" from "authenticated";

revoke update on table "public"."billing_previews" from "authenticated";

revoke delete on table "public"."billing_previews" from "service_role";

revoke insert on table "public"."billing_previews" from "service_role";

revoke references on table "public"."billing_previews" from "service_role";

revoke select on table "public"."billing_previews" from "service_role";

revoke trigger on table "public"."billing_previews" from "service_role";

revoke truncate on table "public"."billing_previews" from "service_role";

revoke update on table "public"."billing_previews" from "service_role";

revoke delete on table "public"."billing_provisions" from "anon";

revoke insert on table "public"."billing_provisions" from "anon";

revoke references on table "public"."billing_provisions" from "anon";

revoke select on table "public"."billing_provisions" from "anon";

revoke trigger on table "public"."billing_provisions" from "anon";

revoke truncate on table "public"."billing_provisions" from "anon";

revoke update on table "public"."billing_provisions" from "anon";

revoke delete on table "public"."boletos" from "anon";

revoke insert on table "public"."boletos" from "anon";

revoke references on table "public"."boletos" from "anon";

revoke trigger on table "public"."boletos" from "anon";

revoke truncate on table "public"."boletos" from "anon";

revoke update on table "public"."boletos" from "anon";

revoke references on table "public"."boletos" from "authenticated";

revoke trigger on table "public"."boletos" from "authenticated";

revoke truncate on table "public"."boletos" from "authenticated";

revoke delete on table "public"."boletos" from "service_role";

revoke insert on table "public"."boletos" from "service_role";

revoke references on table "public"."boletos" from "service_role";

revoke select on table "public"."boletos" from "service_role";

revoke trigger on table "public"."boletos" from "service_role";

revoke truncate on table "public"."boletos" from "service_role";

revoke update on table "public"."boletos" from "service_role";

revoke delete on table "public"."bonus_calculations" from "anon";

revoke insert on table "public"."bonus_calculations" from "anon";

revoke references on table "public"."bonus_calculations" from "anon";

revoke trigger on table "public"."bonus_calculations" from "anon";

revoke truncate on table "public"."bonus_calculations" from "anon";

revoke update on table "public"."bonus_calculations" from "anon";

revoke references on table "public"."bonus_calculations" from "authenticated";

revoke trigger on table "public"."bonus_calculations" from "authenticated";

revoke truncate on table "public"."bonus_calculations" from "authenticated";

revoke delete on table "public"."bonus_calculations" from "service_role";

revoke insert on table "public"."bonus_calculations" from "service_role";

revoke references on table "public"."bonus_calculations" from "service_role";

revoke select on table "public"."bonus_calculations" from "service_role";

revoke trigger on table "public"."bonus_calculations" from "service_role";

revoke truncate on table "public"."bonus_calculations" from "service_role";

revoke update on table "public"."bonus_calculations" from "service_role";

revoke delete on table "public"."bonus_provisions" from "anon";

revoke insert on table "public"."bonus_provisions" from "anon";

revoke references on table "public"."bonus_provisions" from "anon";

revoke select on table "public"."bonus_provisions" from "anon";

revoke trigger on table "public"."bonus_provisions" from "anon";

revoke truncate on table "public"."bonus_provisions" from "anon";

revoke update on table "public"."bonus_provisions" from "anon";

revoke delete on table "public"."branches" from "anon";

revoke insert on table "public"."branches" from "anon";

revoke references on table "public"."branches" from "anon";

revoke trigger on table "public"."branches" from "anon";

revoke truncate on table "public"."branches" from "anon";

revoke update on table "public"."branches" from "anon";

revoke references on table "public"."branches" from "authenticated";

revoke trigger on table "public"."branches" from "authenticated";

revoke truncate on table "public"."branches" from "authenticated";

revoke delete on table "public"."branches" from "service_role";

revoke insert on table "public"."branches" from "service_role";

revoke references on table "public"."branches" from "service_role";

revoke select on table "public"."branches" from "service_role";

revoke trigger on table "public"."branches" from "service_role";

revoke truncate on table "public"."branches" from "service_role";

revoke update on table "public"."branches" from "service_role";

revoke delete on table "public"."calculation_types" from "anon";

revoke insert on table "public"."calculation_types" from "anon";

revoke references on table "public"."calculation_types" from "anon";

revoke trigger on table "public"."calculation_types" from "anon";

revoke truncate on table "public"."calculation_types" from "anon";

revoke update on table "public"."calculation_types" from "anon";

revoke references on table "public"."calculation_types" from "authenticated";

revoke trigger on table "public"."calculation_types" from "authenticated";

revoke truncate on table "public"."calculation_types" from "authenticated";

revoke delete on table "public"."calculation_types" from "service_role";

revoke insert on table "public"."calculation_types" from "service_role";

revoke references on table "public"."calculation_types" from "service_role";

revoke select on table "public"."calculation_types" from "service_role";

revoke trigger on table "public"."calculation_types" from "service_role";

revoke truncate on table "public"."calculation_types" from "service_role";

revoke update on table "public"."calculation_types" from "service_role";

revoke delete on table "public"."calendar_events" from "anon";

revoke insert on table "public"."calendar_events" from "anon";

revoke references on table "public"."calendar_events" from "anon";

revoke trigger on table "public"."calendar_events" from "anon";

revoke truncate on table "public"."calendar_events" from "anon";

revoke update on table "public"."calendar_events" from "anon";

revoke references on table "public"."calendar_events" from "authenticated";

revoke trigger on table "public"."calendar_events" from "authenticated";

revoke truncate on table "public"."calendar_events" from "authenticated";

revoke delete on table "public"."calendar_events" from "service_role";

revoke insert on table "public"."calendar_events" from "service_role";

revoke references on table "public"."calendar_events" from "service_role";

revoke select on table "public"."calendar_events" from "service_role";

revoke trigger on table "public"."calendar_events" from "service_role";

revoke truncate on table "public"."calendar_events" from "service_role";

revoke update on table "public"."calendar_events" from "service_role";

revoke delete on table "public"."chart_of_accounts" from "anon";

revoke insert on table "public"."chart_of_accounts" from "anon";

revoke references on table "public"."chart_of_accounts" from "anon";

revoke trigger on table "public"."chart_of_accounts" from "anon";

revoke truncate on table "public"."chart_of_accounts" from "anon";

revoke update on table "public"."chart_of_accounts" from "anon";

revoke references on table "public"."chart_of_accounts" from "authenticated";

revoke trigger on table "public"."chart_of_accounts" from "authenticated";

revoke truncate on table "public"."chart_of_accounts" from "authenticated";

revoke delete on table "public"."chart_of_accounts" from "service_role";

revoke insert on table "public"."chart_of_accounts" from "service_role";

revoke references on table "public"."chart_of_accounts" from "service_role";

revoke select on table "public"."chart_of_accounts" from "service_role";

revoke trigger on table "public"."chart_of_accounts" from "service_role";

revoke truncate on table "public"."chart_of_accounts" from "service_role";

revoke update on table "public"."chart_of_accounts" from "service_role";

revoke delete on table "public"."client_aliases" from "anon";

revoke insert on table "public"."client_aliases" from "anon";

revoke references on table "public"."client_aliases" from "anon";

revoke trigger on table "public"."client_aliases" from "anon";

revoke truncate on table "public"."client_aliases" from "anon";

revoke update on table "public"."client_aliases" from "anon";

revoke references on table "public"."client_aliases" from "authenticated";

revoke trigger on table "public"."client_aliases" from "authenticated";

revoke truncate on table "public"."client_aliases" from "authenticated";

revoke delete on table "public"."client_branches" from "anon";

revoke insert on table "public"."client_branches" from "anon";

revoke references on table "public"."client_branches" from "anon";

revoke trigger on table "public"."client_branches" from "anon";

revoke truncate on table "public"."client_branches" from "anon";

revoke update on table "public"."client_branches" from "anon";

revoke references on table "public"."client_branches" from "authenticated";

revoke trigger on table "public"."client_branches" from "authenticated";

revoke truncate on table "public"."client_branches" from "authenticated";

revoke delete on table "public"."client_branches" from "service_role";

revoke insert on table "public"."client_branches" from "service_role";

revoke references on table "public"."client_branches" from "service_role";

revoke select on table "public"."client_branches" from "service_role";

revoke trigger on table "public"."client_branches" from "service_role";

revoke truncate on table "public"."client_branches" from "service_role";

revoke update on table "public"."client_branches" from "service_role";

revoke delete on table "public"."client_contacts" from "anon";

revoke insert on table "public"."client_contacts" from "anon";

revoke references on table "public"."client_contacts" from "anon";

revoke trigger on table "public"."client_contacts" from "anon";

revoke truncate on table "public"."client_contacts" from "anon";

revoke update on table "public"."client_contacts" from "anon";

revoke references on table "public"."client_contacts" from "authenticated";

revoke trigger on table "public"."client_contacts" from "authenticated";

revoke truncate on table "public"."client_contacts" from "authenticated";

revoke delete on table "public"."client_contacts" from "service_role";

revoke insert on table "public"."client_contacts" from "service_role";

revoke references on table "public"."client_contacts" from "service_role";

revoke select on table "public"."client_contacts" from "service_role";

revoke trigger on table "public"."client_contacts" from "service_role";

revoke truncate on table "public"."client_contacts" from "service_role";

revoke update on table "public"."client_contacts" from "service_role";

revoke delete on table "public"."client_documents" from "anon";

revoke insert on table "public"."client_documents" from "anon";

revoke references on table "public"."client_documents" from "anon";

revoke trigger on table "public"."client_documents" from "anon";

revoke truncate on table "public"."client_documents" from "anon";

revoke update on table "public"."client_documents" from "anon";

revoke references on table "public"."client_documents" from "authenticated";

revoke trigger on table "public"."client_documents" from "authenticated";

revoke truncate on table "public"."client_documents" from "authenticated";

revoke delete on table "public"."client_documents" from "service_role";

revoke insert on table "public"."client_documents" from "service_role";

revoke references on table "public"."client_documents" from "service_role";

revoke select on table "public"."client_documents" from "service_role";

revoke trigger on table "public"."client_documents" from "service_role";

revoke truncate on table "public"."client_documents" from "service_role";

revoke update on table "public"."client_documents" from "service_role";

revoke delete on table "public"."client_sla_rules" from "anon";

revoke insert on table "public"."client_sla_rules" from "anon";

revoke references on table "public"."client_sla_rules" from "anon";

revoke trigger on table "public"."client_sla_rules" from "anon";

revoke truncate on table "public"."client_sla_rules" from "anon";

revoke update on table "public"."client_sla_rules" from "anon";

revoke references on table "public"."client_sla_rules" from "authenticated";

revoke trigger on table "public"."client_sla_rules" from "authenticated";

revoke truncate on table "public"."client_sla_rules" from "authenticated";

revoke delete on table "public"."client_sla_rules" from "service_role";

revoke insert on table "public"."client_sla_rules" from "service_role";

revoke references on table "public"."client_sla_rules" from "service_role";

revoke select on table "public"."client_sla_rules" from "service_role";

revoke trigger on table "public"."client_sla_rules" from "service_role";

revoke truncate on table "public"."client_sla_rules" from "service_role";

revoke update on table "public"."client_sla_rules" from "service_role";

revoke delete on table "public"."clients" from "anon";

revoke insert on table "public"."clients" from "anon";

revoke references on table "public"."clients" from "anon";

revoke trigger on table "public"."clients" from "anon";

revoke truncate on table "public"."clients" from "anon";

revoke update on table "public"."clients" from "anon";

revoke references on table "public"."clients" from "authenticated";

revoke trigger on table "public"."clients" from "authenticated";

revoke truncate on table "public"."clients" from "authenticated";

revoke delete on table "public"."company_entities" from "anon";

revoke insert on table "public"."company_entities" from "anon";

revoke references on table "public"."company_entities" from "anon";

revoke trigger on table "public"."company_entities" from "anon";

revoke truncate on table "public"."company_entities" from "anon";

revoke update on table "public"."company_entities" from "anon";

revoke references on table "public"."company_entities" from "authenticated";

revoke trigger on table "public"."company_entities" from "authenticated";

revoke truncate on table "public"."company_entities" from "authenticated";

revoke delete on table "public"."company_entities" from "service_role";

revoke insert on table "public"."company_entities" from "service_role";

revoke references on table "public"."company_entities" from "service_role";

revoke select on table "public"."company_entities" from "service_role";

revoke trigger on table "public"."company_entities" from "service_role";

revoke truncate on table "public"."company_entities" from "service_role";

revoke update on table "public"."company_entities" from "service_role";

revoke delete on table "public"."contract_extractions" from "anon";

revoke insert on table "public"."contract_extractions" from "anon";

revoke references on table "public"."contract_extractions" from "anon";

revoke trigger on table "public"."contract_extractions" from "anon";

revoke truncate on table "public"."contract_extractions" from "anon";

revoke update on table "public"."contract_extractions" from "anon";

revoke references on table "public"."contract_extractions" from "authenticated";

revoke trigger on table "public"."contract_extractions" from "authenticated";

revoke truncate on table "public"."contract_extractions" from "authenticated";

revoke delete on table "public"."contract_extractions" from "service_role";

revoke insert on table "public"."contract_extractions" from "service_role";

revoke references on table "public"."contract_extractions" from "service_role";

revoke select on table "public"."contract_extractions" from "service_role";

revoke trigger on table "public"."contract_extractions" from "service_role";

revoke truncate on table "public"."contract_extractions" from "service_role";

revoke update on table "public"."contract_extractions" from "service_role";

revoke delete on table "public"."contract_keys" from "anon";

revoke insert on table "public"."contract_keys" from "anon";

revoke references on table "public"."contract_keys" from "anon";

revoke trigger on table "public"."contract_keys" from "anon";

revoke truncate on table "public"."contract_keys" from "anon";

revoke update on table "public"."contract_keys" from "anon";

revoke references on table "public"."contract_keys" from "authenticated";

revoke trigger on table "public"."contract_keys" from "authenticated";

revoke truncate on table "public"."contract_keys" from "authenticated";

revoke delete on table "public"."contract_keys" from "service_role";

revoke insert on table "public"."contract_keys" from "service_role";

revoke references on table "public"."contract_keys" from "service_role";

revoke select on table "public"."contract_keys" from "service_role";

revoke trigger on table "public"."contract_keys" from "service_role";

revoke truncate on table "public"."contract_keys" from "service_role";

revoke update on table "public"."contract_keys" from "service_role";

revoke delete on table "public"."contract_pricing" from "anon";

revoke insert on table "public"."contract_pricing" from "anon";

revoke references on table "public"."contract_pricing" from "anon";

revoke trigger on table "public"."contract_pricing" from "anon";

revoke truncate on table "public"."contract_pricing" from "anon";

revoke update on table "public"."contract_pricing" from "anon";

revoke references on table "public"."contract_pricing" from "authenticated";

revoke trigger on table "public"."contract_pricing" from "authenticated";

revoke truncate on table "public"."contract_pricing" from "authenticated";

revoke delete on table "public"."contract_pricing" from "service_role";

revoke insert on table "public"."contract_pricing" from "service_role";

revoke references on table "public"."contract_pricing" from "service_role";

revoke select on table "public"."contract_pricing" from "service_role";

revoke trigger on table "public"."contract_pricing" from "service_role";

revoke truncate on table "public"."contract_pricing" from "service_role";

revoke update on table "public"."contract_pricing" from "service_role";

revoke delete on table "public"."cost_centers" from "anon";

revoke insert on table "public"."cost_centers" from "anon";

revoke references on table "public"."cost_centers" from "anon";

revoke trigger on table "public"."cost_centers" from "anon";

revoke truncate on table "public"."cost_centers" from "anon";

revoke update on table "public"."cost_centers" from "anon";

revoke references on table "public"."cost_centers" from "authenticated";

revoke trigger on table "public"."cost_centers" from "authenticated";

revoke truncate on table "public"."cost_centers" from "authenticated";

revoke delete on table "public"."cost_centers" from "service_role";

revoke insert on table "public"."cost_centers" from "service_role";

revoke references on table "public"."cost_centers" from "service_role";

revoke select on table "public"."cost_centers" from "service_role";

revoke trigger on table "public"."cost_centers" from "service_role";

revoke truncate on table "public"."cost_centers" from "service_role";

revoke update on table "public"."cost_centers" from "service_role";

revoke delete on table "public"."custom_roles" from "anon";

revoke insert on table "public"."custom_roles" from "anon";

revoke references on table "public"."custom_roles" from "anon";

revoke trigger on table "public"."custom_roles" from "anon";

revoke truncate on table "public"."custom_roles" from "anon";

revoke update on table "public"."custom_roles" from "anon";

revoke references on table "public"."custom_roles" from "authenticated";

revoke trigger on table "public"."custom_roles" from "authenticated";

revoke truncate on table "public"."custom_roles" from "authenticated";

revoke delete on table "public"."custom_roles" from "service_role";

revoke insert on table "public"."custom_roles" from "service_role";

revoke references on table "public"."custom_roles" from "service_role";

revoke select on table "public"."custom_roles" from "service_role";

revoke trigger on table "public"."custom_roles" from "service_role";

revoke truncate on table "public"."custom_roles" from "service_role";

revoke update on table "public"."custom_roles" from "service_role";

revoke delete on table "public"."economic_groups" from "anon";

revoke insert on table "public"."economic_groups" from "anon";

revoke references on table "public"."economic_groups" from "anon";

revoke trigger on table "public"."economic_groups" from "anon";

revoke truncate on table "public"."economic_groups" from "anon";

revoke update on table "public"."economic_groups" from "anon";

revoke references on table "public"."economic_groups" from "authenticated";

revoke trigger on table "public"."economic_groups" from "authenticated";

revoke truncate on table "public"."economic_groups" from "authenticated";

revoke delete on table "public"."economic_groups" from "service_role";

revoke insert on table "public"."economic_groups" from "service_role";

revoke references on table "public"."economic_groups" from "service_role";

revoke select on table "public"."economic_groups" from "service_role";

revoke trigger on table "public"."economic_groups" from "service_role";

revoke truncate on table "public"."economic_groups" from "service_role";

revoke update on table "public"."economic_groups" from "service_role";

revoke delete on table "public"."expense_splits" from "anon";

revoke insert on table "public"."expense_splits" from "anon";

revoke references on table "public"."expense_splits" from "anon";

revoke trigger on table "public"."expense_splits" from "anon";

revoke truncate on table "public"."expense_splits" from "anon";

revoke update on table "public"."expense_splits" from "anon";

revoke references on table "public"."expense_splits" from "authenticated";

revoke trigger on table "public"."expense_splits" from "authenticated";

revoke truncate on table "public"."expense_splits" from "authenticated";

revoke delete on table "public"."expense_splits" from "service_role";

revoke insert on table "public"."expense_splits" from "service_role";

revoke references on table "public"."expense_splits" from "service_role";

revoke select on table "public"."expense_splits" from "service_role";

revoke trigger on table "public"."expense_splits" from "service_role";

revoke truncate on table "public"."expense_splits" from "service_role";

revoke update on table "public"."expense_splits" from "service_role";

revoke delete on table "public"."expenses" from "anon";

revoke insert on table "public"."expenses" from "anon";

revoke references on table "public"."expenses" from "anon";

revoke trigger on table "public"."expenses" from "anon";

revoke truncate on table "public"."expenses" from "anon";

revoke update on table "public"."expenses" from "anon";

revoke references on table "public"."expenses" from "authenticated";

revoke trigger on table "public"."expenses" from "authenticated";

revoke truncate on table "public"."expenses" from "authenticated";

revoke delete on table "public"."expenses" from "service_role";

revoke insert on table "public"."expenses" from "service_role";

revoke references on table "public"."expenses" from "service_role";

revoke select on table "public"."expenses" from "service_role";

revoke trigger on table "public"."expenses" from "service_role";

revoke truncate on table "public"."expenses" from "service_role";

revoke update on table "public"."expenses" from "service_role";

revoke delete on table "public"."financial_groups" from "anon";

revoke insert on table "public"."financial_groups" from "anon";

revoke references on table "public"."financial_groups" from "anon";

revoke trigger on table "public"."financial_groups" from "anon";

revoke truncate on table "public"."financial_groups" from "anon";

revoke update on table "public"."financial_groups" from "anon";

revoke references on table "public"."financial_groups" from "authenticated";

revoke trigger on table "public"."financial_groups" from "authenticated";

revoke truncate on table "public"."financial_groups" from "authenticated";

revoke delete on table "public"."financial_groups" from "service_role";

revoke insert on table "public"."financial_groups" from "service_role";

revoke references on table "public"."financial_groups" from "service_role";

revoke select on table "public"."financial_groups" from "service_role";

revoke trigger on table "public"."financial_groups" from "service_role";

revoke truncate on table "public"."financial_groups" from "service_role";

revoke update on table "public"."financial_groups" from "service_role";

revoke delete on table "public"."historico_axis" from "anon";

revoke insert on table "public"."historico_axis" from "anon";

revoke references on table "public"."historico_axis" from "anon";

revoke trigger on table "public"."historico_axis" from "anon";

revoke truncate on table "public"."historico_axis" from "anon";

revoke update on table "public"."historico_axis" from "anon";

revoke references on table "public"."historico_axis" from "authenticated";

revoke trigger on table "public"."historico_axis" from "authenticated";

revoke truncate on table "public"."historico_axis" from "authenticated";

revoke delete on table "public"."historico_axis" from "service_role";

revoke insert on table "public"."historico_axis" from "service_role";

revoke references on table "public"."historico_axis" from "service_role";

revoke trigger on table "public"."historico_axis" from "service_role";

revoke truncate on table "public"."historico_axis" from "service_role";

revoke update on table "public"."historico_axis" from "service_role";

revoke delete on table "public"."invoices" from "anon";

revoke insert on table "public"."invoices" from "anon";

revoke references on table "public"."invoices" from "anon";

revoke trigger on table "public"."invoices" from "anon";

revoke truncate on table "public"."invoices" from "anon";

revoke update on table "public"."invoices" from "anon";

revoke references on table "public"."invoices" from "authenticated";

revoke trigger on table "public"."invoices" from "authenticated";

revoke truncate on table "public"."invoices" from "authenticated";

revoke delete on table "public"."invoices" from "service_role";

revoke insert on table "public"."invoices" from "service_role";

revoke references on table "public"."invoices" from "service_role";

revoke select on table "public"."invoices" from "service_role";

revoke trigger on table "public"."invoices" from "service_role";

revoke truncate on table "public"."invoices" from "service_role";

revoke update on table "public"."invoices" from "service_role";

revoke delete on table "public"."monitored_emails" from "anon";

revoke insert on table "public"."monitored_emails" from "anon";

revoke references on table "public"."monitored_emails" from "anon";

revoke trigger on table "public"."monitored_emails" from "anon";

revoke truncate on table "public"."monitored_emails" from "anon";

revoke update on table "public"."monitored_emails" from "anon";

revoke references on table "public"."monitored_emails" from "authenticated";

revoke trigger on table "public"."monitored_emails" from "authenticated";

revoke truncate on table "public"."monitored_emails" from "authenticated";

revoke delete on table "public"."monitored_emails" from "service_role";

revoke insert on table "public"."monitored_emails" from "service_role";

revoke references on table "public"."monitored_emails" from "service_role";

revoke select on table "public"."monitored_emails" from "service_role";

revoke trigger on table "public"."monitored_emails" from "service_role";

revoke truncate on table "public"."monitored_emails" from "service_role";

revoke update on table "public"."monitored_emails" from "service_role";

revoke delete on table "public"."nfse_config" from "anon";

revoke insert on table "public"."nfse_config" from "anon";

revoke references on table "public"."nfse_config" from "anon";

revoke trigger on table "public"."nfse_config" from "anon";

revoke truncate on table "public"."nfse_config" from "anon";

revoke update on table "public"."nfse_config" from "anon";

revoke references on table "public"."nfse_config" from "authenticated";

revoke trigger on table "public"."nfse_config" from "authenticated";

revoke truncate on table "public"."nfse_config" from "authenticated";

revoke delete on table "public"."nfse_config" from "service_role";

revoke insert on table "public"."nfse_config" from "service_role";

revoke references on table "public"."nfse_config" from "service_role";

revoke select on table "public"."nfse_config" from "service_role";

revoke trigger on table "public"."nfse_config" from "service_role";

revoke truncate on table "public"."nfse_config" from "service_role";

revoke update on table "public"."nfse_config" from "service_role";

revoke delete on table "public"."pautas_unificadas" from "anon";

revoke insert on table "public"."pautas_unificadas" from "anon";

revoke references on table "public"."pautas_unificadas" from "anon";

revoke trigger on table "public"."pautas_unificadas" from "anon";

revoke truncate on table "public"."pautas_unificadas" from "anon";

revoke update on table "public"."pautas_unificadas" from "anon";

revoke references on table "public"."pautas_unificadas" from "authenticated";

revoke trigger on table "public"."pautas_unificadas" from "authenticated";

revoke truncate on table "public"."pautas_unificadas" from "authenticated";

revoke delete on table "public"."pautas_unificadas" from "service_role";

revoke insert on table "public"."pautas_unificadas" from "service_role";

revoke references on table "public"."pautas_unificadas" from "service_role";

revoke select on table "public"."pautas_unificadas" from "service_role";

revoke trigger on table "public"."pautas_unificadas" from "service_role";

revoke truncate on table "public"."pautas_unificadas" from "service_role";

revoke update on table "public"."pautas_unificadas" from "service_role";

revoke delete on table "public"."permissions" from "anon";

revoke insert on table "public"."permissions" from "anon";

revoke references on table "public"."permissions" from "anon";

revoke trigger on table "public"."permissions" from "anon";

revoke truncate on table "public"."permissions" from "anon";

revoke update on table "public"."permissions" from "anon";

revoke references on table "public"."permissions" from "authenticated";

revoke trigger on table "public"."permissions" from "authenticated";

revoke truncate on table "public"."permissions" from "authenticated";

revoke delete on table "public"."permissions" from "service_role";

revoke insert on table "public"."permissions" from "service_role";

revoke references on table "public"."permissions" from "service_role";

revoke select on table "public"."permissions" from "service_role";

revoke trigger on table "public"."permissions" from "service_role";

revoke truncate on table "public"."permissions" from "service_role";

revoke update on table "public"."permissions" from "service_role";

revoke delete on table "public"."phase_area_mapping" from "anon";

revoke insert on table "public"."phase_area_mapping" from "anon";

revoke references on table "public"."phase_area_mapping" from "anon";

revoke trigger on table "public"."phase_area_mapping" from "anon";

revoke truncate on table "public"."phase_area_mapping" from "anon";

revoke update on table "public"."phase_area_mapping" from "anon";

revoke references on table "public"."phase_area_mapping" from "authenticated";

revoke trigger on table "public"."phase_area_mapping" from "authenticated";

revoke truncate on table "public"."phase_area_mapping" from "authenticated";

revoke delete on table "public"."phase_area_mapping" from "service_role";

revoke insert on table "public"."phase_area_mapping" from "service_role";

revoke references on table "public"."phase_area_mapping" from "service_role";

revoke select on table "public"."phase_area_mapping" from "service_role";

revoke trigger on table "public"."phase_area_mapping" from "service_role";

revoke truncate on table "public"."phase_area_mapping" from "service_role";

revoke update on table "public"."phase_area_mapping" from "service_role";

revoke delete on table "public"."process_deadlines" from "anon";

revoke insert on table "public"."process_deadlines" from "anon";

revoke references on table "public"."process_deadlines" from "anon";

revoke trigger on table "public"."process_deadlines" from "anon";

revoke truncate on table "public"."process_deadlines" from "anon";

revoke update on table "public"."process_deadlines" from "anon";

revoke references on table "public"."process_deadlines" from "authenticated";

revoke trigger on table "public"."process_deadlines" from "authenticated";

revoke truncate on table "public"."process_deadlines" from "authenticated";

revoke delete on table "public"."processed_files" from "anon";

revoke insert on table "public"."processed_files" from "anon";

revoke references on table "public"."processed_files" from "anon";

revoke trigger on table "public"."processed_files" from "anon";

revoke truncate on table "public"."processed_files" from "anon";

revoke update on table "public"."processed_files" from "anon";

revoke references on table "public"."processed_files" from "authenticated";

revoke trigger on table "public"."processed_files" from "authenticated";

revoke truncate on table "public"."processed_files" from "authenticated";

revoke delete on table "public"."processed_files" from "service_role";

revoke insert on table "public"."processed_files" from "service_role";

revoke references on table "public"."processed_files" from "service_role";

revoke select on table "public"."processed_files" from "service_role";

revoke trigger on table "public"."processed_files" from "service_role";

revoke truncate on table "public"."processed_files" from "service_role";

revoke update on table "public"."processed_files" from "service_role";

revoke delete on table "public"."processes" from "anon";

revoke insert on table "public"."processes" from "anon";

revoke references on table "public"."processes" from "anon";

revoke trigger on table "public"."processes" from "anon";

revoke truncate on table "public"."processes" from "anon";

revoke update on table "public"."processes" from "anon";

revoke references on table "public"."processes" from "authenticated";

revoke trigger on table "public"."processes" from "authenticated";

revoke truncate on table "public"."processes" from "authenticated";

revoke delete on table "public"."processing_logs" from "anon";

revoke insert on table "public"."processing_logs" from "anon";

revoke references on table "public"."processing_logs" from "anon";

revoke trigger on table "public"."processing_logs" from "anon";

revoke truncate on table "public"."processing_logs" from "anon";

revoke update on table "public"."processing_logs" from "anon";

revoke references on table "public"."processing_logs" from "authenticated";

revoke trigger on table "public"."processing_logs" from "authenticated";

revoke truncate on table "public"."processing_logs" from "authenticated";

revoke delete on table "public"."processing_logs" from "service_role";

revoke insert on table "public"."processing_logs" from "service_role";

revoke references on table "public"."processing_logs" from "service_role";

revoke select on table "public"."processing_logs" from "service_role";

revoke trigger on table "public"."processing_logs" from "service_role";

revoke truncate on table "public"."processing_logs" from "service_role";

revoke update on table "public"."processing_logs" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke delete on table "public"."related_processes" from "anon";

revoke insert on table "public"."related_processes" from "anon";

revoke references on table "public"."related_processes" from "anon";

revoke trigger on table "public"."related_processes" from "anon";

revoke truncate on table "public"."related_processes" from "anon";

revoke update on table "public"."related_processes" from "anon";

revoke references on table "public"."related_processes" from "authenticated";

revoke trigger on table "public"."related_processes" from "authenticated";

revoke truncate on table "public"."related_processes" from "authenticated";

revoke delete on table "public"."related_processes" from "service_role";

revoke insert on table "public"."related_processes" from "service_role";

revoke references on table "public"."related_processes" from "service_role";

revoke select on table "public"."related_processes" from "service_role";

revoke trigger on table "public"."related_processes" from "service_role";

revoke truncate on table "public"."related_processes" from "service_role";

revoke update on table "public"."related_processes" from "service_role";

revoke delete on table "public"."role_permissions" from "anon";

revoke insert on table "public"."role_permissions" from "anon";

revoke references on table "public"."role_permissions" from "anon";

revoke trigger on table "public"."role_permissions" from "anon";

revoke truncate on table "public"."role_permissions" from "anon";

revoke update on table "public"."role_permissions" from "anon";

revoke references on table "public"."role_permissions" from "authenticated";

revoke trigger on table "public"."role_permissions" from "authenticated";

revoke truncate on table "public"."role_permissions" from "authenticated";

revoke delete on table "public"."role_permissions" from "service_role";

revoke insert on table "public"."role_permissions" from "service_role";

revoke references on table "public"."role_permissions" from "service_role";

revoke select on table "public"."role_permissions" from "service_role";

revoke trigger on table "public"."role_permissions" from "service_role";

revoke truncate on table "public"."role_permissions" from "service_role";

revoke update on table "public"."role_permissions" from "service_role";

revoke delete on table "public"."solicitacoes" from "anon";

revoke insert on table "public"."solicitacoes" from "anon";

revoke references on table "public"."solicitacoes" from "anon";

revoke trigger on table "public"."solicitacoes" from "anon";

revoke truncate on table "public"."solicitacoes" from "anon";

revoke update on table "public"."solicitacoes" from "anon";

revoke references on table "public"."solicitacoes" from "authenticated";

revoke trigger on table "public"."solicitacoes" from "authenticated";

revoke truncate on table "public"."solicitacoes" from "authenticated";

revoke delete on table "public"."sync_logs" from "anon";

revoke insert on table "public"."sync_logs" from "anon";

revoke references on table "public"."sync_logs" from "anon";

revoke trigger on table "public"."sync_logs" from "anon";

revoke truncate on table "public"."sync_logs" from "anon";

revoke update on table "public"."sync_logs" from "anon";

revoke references on table "public"."sync_logs" from "authenticated";

revoke trigger on table "public"."sync_logs" from "authenticated";

revoke truncate on table "public"."sync_logs" from "authenticated";

revoke delete on table "public"."tax_rules" from "anon";

revoke insert on table "public"."tax_rules" from "anon";

revoke references on table "public"."tax_rules" from "anon";

revoke trigger on table "public"."tax_rules" from "anon";

revoke truncate on table "public"."tax_rules" from "anon";

revoke update on table "public"."tax_rules" from "anon";

revoke references on table "public"."tax_rules" from "authenticated";

revoke trigger on table "public"."tax_rules" from "authenticated";

revoke truncate on table "public"."tax_rules" from "authenticated";

revoke delete on table "public"."tax_rules" from "service_role";

revoke insert on table "public"."tax_rules" from "service_role";

revoke references on table "public"."tax_rules" from "service_role";

revoke select on table "public"."tax_rules" from "service_role";

revoke trigger on table "public"."tax_rules" from "service_role";

revoke truncate on table "public"."tax_rules" from "service_role";

revoke update on table "public"."tax_rules" from "service_role";

revoke delete on table "public"."team_clients" from "anon";

revoke insert on table "public"."team_clients" from "anon";

revoke references on table "public"."team_clients" from "anon";

revoke trigger on table "public"."team_clients" from "anon";

revoke truncate on table "public"."team_clients" from "anon";

revoke update on table "public"."team_clients" from "anon";

revoke references on table "public"."team_clients" from "authenticated";

revoke trigger on table "public"."team_clients" from "authenticated";

revoke truncate on table "public"."team_clients" from "authenticated";

revoke delete on table "public"."team_clients" from "service_role";

revoke insert on table "public"."team_clients" from "service_role";

revoke references on table "public"."team_clients" from "service_role";

revoke select on table "public"."team_clients" from "service_role";

revoke trigger on table "public"."team_clients" from "service_role";

revoke truncate on table "public"."team_clients" from "service_role";

revoke update on table "public"."team_clients" from "service_role";

revoke delete on table "public"."timesheet_entries" from "anon";

revoke insert on table "public"."timesheet_entries" from "anon";

revoke references on table "public"."timesheet_entries" from "anon";

revoke trigger on table "public"."timesheet_entries" from "anon";

revoke truncate on table "public"."timesheet_entries" from "anon";

revoke update on table "public"."timesheet_entries" from "anon";

revoke references on table "public"."timesheet_entries" from "authenticated";

revoke trigger on table "public"."timesheet_entries" from "authenticated";

revoke truncate on table "public"."timesheet_entries" from "authenticated";

revoke delete on table "public"."timesheet_entries" from "service_role";

revoke references on table "public"."timesheet_entries" from "service_role";

revoke trigger on table "public"."timesheet_entries" from "service_role";

revoke truncate on table "public"."timesheet_entries" from "service_role";

revoke delete on table "public"."treasury_entries" from "anon";

revoke insert on table "public"."treasury_entries" from "anon";

revoke references on table "public"."treasury_entries" from "anon";

revoke trigger on table "public"."treasury_entries" from "anon";

revoke truncate on table "public"."treasury_entries" from "anon";

revoke update on table "public"."treasury_entries" from "anon";

revoke references on table "public"."treasury_entries" from "authenticated";

revoke trigger on table "public"."treasury_entries" from "authenticated";

revoke truncate on table "public"."treasury_entries" from "authenticated";

revoke delete on table "public"."treasury_entries" from "service_role";

revoke insert on table "public"."treasury_entries" from "service_role";

revoke references on table "public"."treasury_entries" from "service_role";

revoke select on table "public"."treasury_entries" from "service_role";

revoke trigger on table "public"."treasury_entries" from "service_role";

revoke truncate on table "public"."treasury_entries" from "service_role";

revoke update on table "public"."treasury_entries" from "service_role";

revoke delete on table "public"."user_aliases" from "anon";

revoke insert on table "public"."user_aliases" from "anon";

revoke references on table "public"."user_aliases" from "anon";

revoke trigger on table "public"."user_aliases" from "anon";

revoke truncate on table "public"."user_aliases" from "anon";

revoke update on table "public"."user_aliases" from "anon";

revoke references on table "public"."user_aliases" from "authenticated";

revoke trigger on table "public"."user_aliases" from "authenticated";

revoke truncate on table "public"."user_aliases" from "authenticated";

revoke delete on table "public"."user_permission_overrides" from "anon";

revoke insert on table "public"."user_permission_overrides" from "anon";

revoke references on table "public"."user_permission_overrides" from "anon";

revoke trigger on table "public"."user_permission_overrides" from "anon";

revoke truncate on table "public"."user_permission_overrides" from "anon";

revoke update on table "public"."user_permission_overrides" from "anon";

revoke references on table "public"."user_permission_overrides" from "authenticated";

revoke trigger on table "public"."user_permission_overrides" from "authenticated";

revoke truncate on table "public"."user_permission_overrides" from "authenticated";

revoke delete on table "public"."user_permission_overrides" from "service_role";

revoke insert on table "public"."user_permission_overrides" from "service_role";

revoke references on table "public"."user_permission_overrides" from "service_role";

revoke select on table "public"."user_permission_overrides" from "service_role";

revoke trigger on table "public"."user_permission_overrides" from "service_role";

revoke truncate on table "public"."user_permission_overrides" from "service_role";

revoke update on table "public"."user_permission_overrides" from "service_role";

revoke delete on table "public"."user_roles" from "anon";

revoke insert on table "public"."user_roles" from "anon";

revoke references on table "public"."user_roles" from "anon";

revoke trigger on table "public"."user_roles" from "anon";

revoke truncate on table "public"."user_roles" from "anon";

revoke update on table "public"."user_roles" from "anon";

revoke references on table "public"."user_roles" from "authenticated";

revoke trigger on table "public"."user_roles" from "authenticated";

revoke truncate on table "public"."user_roles" from "authenticated";

revoke delete on table "public"."user_roles" from "service_role";

revoke insert on table "public"."user_roles" from "service_role";

revoke references on table "public"."user_roles" from "service_role";

revoke select on table "public"."user_roles" from "service_role";

revoke trigger on table "public"."user_roles" from "service_role";

revoke truncate on table "public"."user_roles" from "service_role";

revoke update on table "public"."user_roles" from "service_role";

drop function if exists "private"."invoke_edge_function"(p_function_name text, p_body jsonb);

drop view if exists "public"."profiles_safe";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_cashflow_summary(p_start_date date, p_end_date date, p_branch_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: requer role financeiro';
  END IF;

  RETURN (
    WITH pagamentos AS (
      SELECT
        to_char(COALESCE(data_pagamento, data_vencimento)::date, 'YYYY-MM') AS month_key,
        sum(valor) AS total_pagamentos
      FROM expenses
      WHERE status = 'paga'
        AND COALESCE(data_pagamento, data_vencimento) >= p_start_date
        AND COALESCE(data_pagamento, data_vencimento) <= p_end_date
        AND (p_branch_ids IS NULL OR branch_id = ANY(p_branch_ids))
      GROUP BY to_char(COALESCE(data_pagamento, data_vencimento)::date, 'YYYY-MM')
    ),
    recebimentos AS (
      SELECT
        to_char(data_vencimento::date, 'YYYY-MM') AS month_key,
        sum(valor) AS total_recebimentos
      FROM invoices
      WHERE status = 'paga'
        AND data_vencimento >= p_start_date
        AND data_vencimento <= p_end_date
        AND (p_branch_ids IS NULL OR branch_id = ANY(p_branch_ids))
      GROUP BY to_char(data_vencimento::date, 'YYYY-MM')
    ),
    months AS (
      SELECT DISTINCT month_key FROM pagamentos
      UNION
      SELECT DISTINCT month_key FROM recebimentos
    ),
    summary AS (
      SELECT
        m.month_key as "month",
        COALESCE(r.total_recebimentos, 0) AS recebimentos,
        COALESCE(p.total_pagamentos, 0) AS pagamentos,
        COALESCE(r.total_recebimentos, 0) - COALESCE(p.total_pagamentos, 0) AS fluxo
      FROM months m
      LEFT JOIN pagamentos p ON p.month_key = m.month_key
      LEFT JOIN recebimentos r ON r.month_key = m.month_key
      ORDER BY m.month_key
    )
    SELECT jsonb_build_object(
      'data', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM summary s), '[]'::jsonb),
      'totais', jsonb_build_object(
        'recebimentos', COALESCE((SELECT sum(recebimentos) FROM summary), 0),
        'pagamentos', COALESCE((SELECT sum(pagamentos) FROM summary), 0),
        'saldo', COALESCE((SELECT sum(fluxo) FROM summary), 0)
      )
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_cost_center_summary(p_start_date date, p_end_date date, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: requer role financeiro';
  END IF;

  RETURN (
    WITH raw_expenses AS (
      SELECT 
        COALESCE(centro_custo, 'Sem centro de custo') as cc,
        SUM(valor) as exp_total,
        SUM(CASE WHEN status = 'paga' THEN valor ELSE 0 END) as exp_baixado,
        SUM(CASE WHEN data_vencimento < CURRENT_DATE AND status = 'pendente' THEN valor ELSE 0 END) as exp_vencido,
        SUM(CASE WHEN data_vencimento >= CURRENT_DATE AND status = 'pendente' THEN valor ELSE 0 END) as exp_em_aberto
      FROM expenses
      WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date
        AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      GROUP BY COALESCE(centro_custo, 'Sem centro de custo')
    ),
    raw_invoices AS (
      SELECT 
        COALESCE(b.centro_custo, 'Sem centro de custo') as cc,
        SUM(i.valor) as inv_total,
        SUM(CASE WHEN i.status = 'paga' THEN i.valor ELSE 0 END) as inv_baixado,
        SUM(CASE WHEN i.data_vencimento < CURRENT_DATE AND i.status NOT IN ('paga', 'cancelada') THEN i.valor ELSE 0 END) as inv_vencido,
        SUM(CASE WHEN i.data_vencimento >= CURRENT_DATE AND i.status NOT IN ('paga', 'cancelada') THEN i.valor ELSE 0 END) as inv_em_aberto
      FROM invoices i
      LEFT JOIN billing_contacts b ON b.id = i.billing_contact_id
      WHERE i.data_vencimento >= p_start_date AND i.data_vencimento <= p_end_date
        AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      GROUP BY COALESCE(b.centro_custo, 'Sem centro de custo')
    ),
    all_ccs AS (
      SELECT cc FROM raw_expenses UNION SELECT cc FROM raw_invoices
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'centroCusto', c.cc,
        'valorTotal', COALESCE(e.exp_total, 0) + COALESCE(i.inv_total, 0),
        'emAberto', COALESCE(e.exp_em_aberto, 0) + COALESCE(i.inv_em_aberto, 0),
        'vencido', COALESCE(e.exp_vencido, 0) + COALESCE(i.inv_vencido, 0),
        'baixado', COALESCE(e.exp_baixado, 0) + COALESCE(i.inv_baixado, 0)
      )
      ORDER BY (COALESCE(e.exp_total, 0) + COALESCE(i.inv_total, 0)) DESC
    ), '[]'::jsonb)
    FROM all_ccs c
    LEFT JOIN raw_expenses e ON e.cc = c.cc
    LEFT JOIN raw_invoices i ON i.cc = c.cc
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_financial_dre_summary(p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: requer role financeiro';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'receitaBruta', COALESCE((SELECT sum(valor) FROM invoices WHERE data_emissao >= p_start_date AND data_emissao <= p_end_date), 0),
      'receitaRealizada', COALESCE((SELECT sum(valor) FROM invoices WHERE data_emissao >= p_start_date AND data_emissao <= p_end_date AND status = 'paga'), 0),
      'despesasTotal', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga'), 0),
      'despesasAdmin', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga' AND categoria IN ('administrativa', 'aluguel', 'utilidades')), 0),
      'despesasPessoal', COALESCE((SELECT sum(valor) FROM expenses WHERE data_vencimento >= p_start_date AND data_vencimento <= p_end_date AND status = 'paga' AND categoria IN ('pessoal', 'salarios', 'beneficios')), 0)
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_produtividade_report(p_month date, p_area text DEFAULT NULL::text, p_collaborator_id uuid DEFAULT NULL::uuid, p_client_id uuid DEFAULT NULL::uuid, p_coordinator_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_month_start date := date_trunc('month', p_month)::date;
  v_month_end   date := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_history_start date := (date_trunc('month', p_month) - interval '5 months')::date;

  v_bypass_filters boolean := false;
  v_is_coord boolean := false;
  v_my_profile_id uuid;
  v_coord_profile_id uuid;
  v_allowed_user_ids uuid[];

  v_rows jsonb;
  v_history jsonb;
BEGIN
  -- Permission scope (same logic as previous version)
  IF p_user_id IS NOT NULL THEN
    IF public.has_role(p_user_id, 'admin')
       OR public.has_role(p_user_id, 'socio')
       OR public.has_role(p_user_id, 'gerente') THEN
      v_bypass_filters := true;
    ELSIF public.has_role(p_user_id, 'coordenador') THEN
      v_is_coord := true;
    END IF;

    IF NOT v_bypass_filters THEN
      SELECT id INTO v_my_profile_id FROM profiles WHERE user_id = p_user_id LIMIT 1;
      IF v_is_coord AND v_my_profile_id IS NOT NULL THEN
        SELECT array_agg(user_id) INTO v_allowed_user_ids
        FROM profiles WHERE reports_to = v_my_profile_id;
        IF v_allowed_user_ids IS NULL THEN
          v_allowed_user_ids := ARRAY[p_user_id];
        ELSE
          v_allowed_user_ids := array_append(v_allowed_user_ids, p_user_id);
        END IF;
      ELSE
        v_allowed_user_ids := ARRAY[p_user_id];
      END IF;
    END IF;
  END IF;

  -- Coordinator filter: resolve profile id once
  IF p_coordinator_id IS NOT NULL THEN
    SELECT id INTO v_coord_profile_id FROM profiles WHERE user_id = p_coordinator_id LIMIT 1;
  END IF;

  -- (a) Current month rows
  WITH base_profiles AS (
    SELECT user_id, full_name, area, reports_to
    FROM profiles
    WHERE is_active = true
      AND (p_area IS NULL OR area::text = p_area)
      AND (p_collaborator_id IS NULL OR user_id = p_collaborator_id)
      AND (p_coordinator_id IS NULL OR user_id = p_coordinator_id OR reports_to = v_coord_profile_id)
      AND (v_bypass_filters = true OR v_allowed_user_ids IS NULL OR user_id = ANY(v_allowed_user_ids))
  ),
  entries AS (
    SELECT e.user_id, e.quantidade, at.weight, e.process_id
    FROM timesheet_entries e
    LEFT JOIN activity_types at ON at.id = e.activity_type_id
    WHERE e.data_atividade >= v_month_start
      AND e.data_atividade <= v_month_end
      AND e.user_id IN (SELECT user_id FROM base_profiles)
  ),
  filtered_entries AS (
    SELECT * FROM entries e
    WHERE p_client_id IS NULL
       OR EXISTS (SELECT 1 FROM processes p WHERE p.id = e.process_id AND p.id_cliente = p_client_id)
  ),
  user_stats AS (
    SELECT user_id, SUM(quantidade * COALESCE(weight, 0)) AS total_weighted
    FROM filtered_entries
    GROUP BY user_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_id', bp.user_id,
      'full_name', bp.full_name,
      'area', bp.area,
      'total_weighted', COALESCE(us.total_weighted, 0),
      'monthly_goal', COALESCE(g.monthly_goal, 0),
      'percentage', CASE WHEN COALESCE(g.monthly_goal, 0) > 0
                         THEN (COALESCE(us.total_weighted, 0) / g.monthly_goal) * 100
                         ELSE 0 END,
      'bonus_projected', CASE WHEN COALESCE(us.total_weighted, 0) > COALESCE(g.monthly_goal, 0)
                              THEN (us.total_weighted - g.monthly_goal) * COALESCE(g.extra_value_per_calculation, 0)
                              ELSE 0 END
    ) ORDER BY (CASE WHEN COALESCE(g.monthly_goal, 0) > 0
                     THEN (COALESCE(us.total_weighted, 0) / g.monthly_goal) * 100
                     ELSE 0 END) DESC
  ), '[]'::jsonb)
  INTO v_rows
  FROM base_profiles bp
  LEFT JOIN user_stats us ON us.user_id = bp.user_id
  LEFT JOIN area_goals g ON g.area = bp.area;

  -- (b) 6-month history in ONE aggregated query
  WITH months AS (
    SELECT generate_series(v_history_start, v_month_start, interval '1 month')::date AS m
  ),
  scoped_profiles AS (
    SELECT user_id, area
    FROM profiles
    WHERE is_active = true
      AND (p_area IS NULL OR area::text = p_area)
      AND (p_collaborator_id IS NULL OR user_id = p_collaborator_id)
      AND (p_coordinator_id IS NULL OR user_id = p_coordinator_id OR reports_to = v_coord_profile_id)
      AND (v_bypass_filters = true OR v_allowed_user_ids IS NULL OR user_id = ANY(v_allowed_user_ids))
  ),
  hist_entries AS (
    SELECT
      date_trunc('month', e.data_atividade)::date AS m,
      sp.area,
      e.user_id,
      e.quantidade * COALESCE(at.weight, 0) AS weighted
    FROM timesheet_entries e
    JOIN scoped_profiles sp ON sp.user_id = e.user_id
    LEFT JOIN activity_types at ON at.id = e.activity_type_id
    WHERE e.data_atividade >= v_history_start
      AND e.data_atividade <  (v_month_start + interval '1 month')
      AND (p_client_id IS NULL OR EXISTS (
        SELECT 1 FROM processes p WHERE p.id = e.process_id AND p.id_cliente = p_client_id
      ))
  ),
  per_user_month AS (
    SELECT he.m, he.user_id, he.area, SUM(he.weighted) AS total_w
    FROM hist_entries he
    GROUP BY he.m, he.user_id, he.area
  ),
  per_user_pct AS (
    SELECT pum.m,
           CASE WHEN COALESCE(g.monthly_goal, 0) > 0
                THEN (pum.total_w / g.monthly_goal) * 100
                ELSE 0 END AS pct
    FROM per_user_month pum
    LEFT JOIN area_goals g ON g.area = pum.area
    WHERE COALESCE(g.monthly_goal, 0) > 0
  ),
  agg AS (
    SELECT m, AVG(pct)::float AS avg_pct
    FROM per_user_pct
    GROUP BY m
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', to_char(months.m, 'Mon/YY'),
      'avg', COALESCE(agg.avg_pct, 0)
    ) ORDER BY months.m
  ), '[]'::jsonb)
  INTO v_history
  FROM months
  LEFT JOIN agg ON agg.m = months.m;

  RETURN jsonb_build_object(
    'rows', COALESCE(v_rows, '[]'::jsonb),
    'history', COALESCE(v_history, '[]'::jsonb)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_treasury_summary(p_start_date date, p_end_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_accounts json;
  v_monthly json;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'socio')
    OR public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'financeiro')
    OR public.has_role(auth.uid(), 'assistente_financeiro')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: requer role financeiro';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', ba.id,
      'conta', ba.conta,
      'banco', ba.banco,
      'descricao', ba.descricao,
      'entradas', COALESCE(te.entradas, 0),
      'saidas', COALESCE(te.saidas, 0),
      'saldo', COALESCE(te.entradas, 0) - COALESCE(te.saidas, 0)
    )
  ) INTO v_accounts
  FROM bank_accounts_config ba
  LEFT JOIN (
    SELECT bank_account_id,
           SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) as entradas,
           SUM(CASE WHEN tipo IN ('saida', 'transferencia') THEN valor ELSE 0 END) as saidas
    FROM treasury_entries
    WHERE data_movimentacao >= p_start_date AND data_movimentacao <= p_end_date
    GROUP BY bank_account_id
  ) te ON te.bank_account_id = ba.id
  WHERE ba.is_active = true;

  SELECT json_agg(
    json_build_object(
      'month', month,
      'entradas', entradas,
      'saidas', saidas
    ) ORDER BY month
  ) INTO v_monthly
  FROM (
    SELECT
      to_char(data_movimentacao, 'YYYY-MM') AS month,
      SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END) AS entradas,
      SUM(CASE WHEN tipo IN ('saida', 'transferencia') THEN valor ELSE 0 END) AS saidas
    FROM treasury_entries
    WHERE data_movimentacao >= p_start_date AND data_movimentacao <= p_end_date
    GROUP BY to_char(data_movimentacao, 'YYYY-MM')
  ) monthly_data;

  RETURN json_build_object(
    'accounts', COALESCE(v_accounts, '[]'::json),
    'monthlyData', COALESCE(v_monthly, '[]'::json)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_user_id uuid;
  v_domain text;
  v_is_authorized boolean;
BEGIN
  -- Validate email domain
  v_domain := lower(split_part(NEW.email, '@', 2));

  SELECT EXISTS (
    SELECT 1 FROM public.authorized_email_domains
    WHERE domain = v_domain AND COALESCE(active, true) = true
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    DELETE FROM auth.users WHERE id = NEW.id;
    RAISE EXCEPTION 'DOMAIN_NOT_AUTHORIZED: O domínio "%" não está autorizado a acessar este sistema.', v_domain
      USING ERRCODE = 'P0001';
  END IF;

  -- Re-attach legacy profile with same email but different user_id
  SELECT user_id INTO v_old_user_id
  FROM public.profiles
  WHERE email = NEW.email
    AND user_id <> NEW.id
  LIMIT 1;

  IF v_old_user_id IS NOT NULL THEN
    UPDATE public.timesheet_entries SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.calendar_events SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.bonus_calculations SET user_id = NEW.id WHERE user_id = v_old_user_id;
    UPDATE public.process_deadlines SET assigned_to = NEW.id WHERE assigned_to = v_old_user_id;
    UPDATE public.process_deadlines SET completed_by = NEW.id WHERE completed_by = v_old_user_id;
    UPDATE public.user_roles SET user_id = NEW.id WHERE user_id = v_old_user_id;

    UPDATE public.profiles
    SET user_id = NEW.id,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        is_active = true
    WHERE user_id = v_old_user_id;
  ELSE
    -- Minimal profile, pending approval
    INSERT INTO public.profiles (user_id, full_name, email, is_active, approved)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      true,
      false
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Assign temporary 'convidado' role so the user can hit /aguardando-aprovacao
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'convidado'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$
;

create or replace view "public"."profiles_safe" as  SELECT id,
    user_id,
    full_name,
    email,
    area,
    sigla,
    is_active,
    reports_to
   FROM public.profiles;



  create policy "Authenticated users can view all active profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (((is_active = true) OR (reports_to IS NOT NULL)));


drop schema if exists "private";

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


